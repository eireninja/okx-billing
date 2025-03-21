/**
 * OKX API Integration Script
 *
 * This script is designed to interact with the OKX API to retrieve trading data
 * for spot, USDT-margined perpetuals (perps), and coin-margined perpetuals (invperps).
 *
 * It provides functions to:
 * 1. Check account configuration and balances
 * 2. Retrieve trading history for different instrument types
 * 3. Check leverage settings and active positions
 */

// Load environment variables from .env file
require("dotenv").config();

const fetch = require("node-fetch");
const crypto = require("crypto");
const fs = require("fs");
const { dbClient } = require("./database");

// API credentials (used as fallback if database retrieval fails)
const API_KEY = process.env.API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;
const PASSPHRASE = process.env.PASSPHRASE;

// API constants
const OKX_API_URL = "https://www.okx.com";

/**
 * Generates a signature for OKX API requests
 * @param {string} timestamp - ISO timestamp
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} requestPath - API endpoint path
 * @param {string} body - Request body for POST requests
 * @param {string} secretKey - API secret key
 * @returns {string} - Signature for the request
 */
function generateSignature(timestamp, method, requestPath, body, secretKey) {
  const message = timestamp + method + requestPath + (body || "");
  return crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
}

/**
 * Generates headers for OKX API requests
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path
 * @param {string} body - Request body for POST requests
 * @param {Object} credentials - API credentials
 * @returns {Object} - Request headers and timestamp
 */
function generateOkxRequest(method, path, body, credentials) {
  const { apiKey, secretKey, passphrase } = credentials;
  const timestamp = new Date().toISOString().split(".")[0] + "Z";
  const signature = generateSignature(timestamp, method, path, body, secretKey);

  const signResult = {
    timestamp,
    signature,
  };

  const headers = {
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": signResult.signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "Content-Type": "application/json",
  };

  return { headers, timestamp };
}

/**
 * Makes a request to the OKX API
 * @param {Object} credentials - API credentials
 * @param {string} method - HTTP method
 * @param {string} path - API endpoint path
 * @param {string} body - Request body for POST requests
 * @returns {Promise<Object>} - API response
 */
async function makeOkxApiRequest(credentials, method, path, body) {
  try {
    console.log(`Making ${method} request to ${path}`);
    const { headers } = generateOkxRequest(method, path, body, credentials);

    const response = await fetch(`${OKX_API_URL}${path}`, {
      method,
      headers,
      body: method === "POST" ? body : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (data.code !== "0") {
      throw new Error(
        `API Error: ${data.msg || "Unknown error"} (Code: ${data.code})`
      );
    }

    return data;
  } catch (error) {
    console.error(`Error in makeOkxApiRequest: ${error.message}`);
    throw error;
  }
}

/**
 * Gets account configuration
 * @param {Object} credentials - API credentials
 * @returns {Promise<Object>} - Account configuration
 */
async function getAccountConfig(credentials) {
  console.log("\n=== CHECKING ACCOUNT CONFIG ===");
  try {
    const path = "/api/v5/account/config";
    const data = await makeOkxApiRequest(credentials, "GET", path);
    console.log("Account Config:");
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("Error getting account config:", error.message);
    return null;
  }
}

/**
 * Gets account balance
 * @param {Object} credentials - API credentials
 * @returns {Promise<Object>} - Account balance
 */
async function getAccountBalance(credentials) {
  console.log("\n=== CHECKING ACCOUNT BALANCE ===");
  try {
    const path = "/api/v5/account/balance";
    const data = await makeOkxApiRequest(credentials, "GET", path);
    console.log("Account Balance:");
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("Error getting account balance:", error.message);
    return null;
  }
}

/**
 * Gets active positions
 * @param {Object} credentials - API credentials
 * @returns {Object} - Positions data
 */
async function getActivePositions(credentials) {
  try {
    console.log("\n=== CHECKING ACTIVE POSITIONS ===");
    const positions = await makeOkxApiRequest(
      credentials,
      "GET",
      "/api/v5/account/positions"
    );
    console.log("Active Positions:");
    console.log(JSON.stringify(positions, null, 2));
    return positions;
  } catch (error) {
    console.error(`Error getting active positions: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Gets bills for a specific instrument for the last 30 days
 * @param {Object} credentials - API credentials
 * @param {string} instId - Instrument ID
 * @param {string} description - Description for logging
 * @returns {Object} - Bills data
 */
async function getBills(credentials, instId, description) {
  try {
    console.log(`\n=== CHECKING BILLS FOR ${description} (${instId}) ===`);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let allBills = [],
      after = "";

    while (true) {
      const bills = await makeOkxApiRequest(
        credentials,
        "GET",
        `/api/v5/account/bills?instId=${instId}&limit=100${
          after ? "&after=" + after : ""
        }`
      );

      if (!bills.data?.length) break;

      // Add bills from last 30 days
      const newBills = bills.data.filter(
        (b) => parseInt(b.ts) >= thirtyDaysAgo
      );
      if (newBills.length < bills.data.length) break; // Found bills older than 30 days

      allBills = allBills.concat(newBills);
      after = bills.data[bills.data.length - 1].billId;
    }

    return { code: "0", data: allBills, msg: "" };
  } catch (error) {
    console.error(`Error getting bills for ${instId}: ${error.message}`);
    return { error: error.message };
  }
}

// Helper function to calculate total PnL from bills
function calculateTotalPnL(bills) {
  if (!bills?.data) return 0;
  return bills.data.reduce(
    (total, bill) => total + parseFloat(bill.pnl || 0),
    0
  );
}

/**
 * Generates a report file with the collected data
 * @param {string} filename - Prefix for the report file name
 * @param {Array} reportData - Array of report data objects from different API keys
 */
async function generateReport(filename, reportData) {
  const reportFilename = `${filename}_${new Date()
    .toISOString()
    .replace(/:/g, "-")}.json`;
  const currentDate = new Date().toLocaleDateString("en-GB");

  const formattedReport = {
    timestamp: new Date().toISOString(),
    reportName: "OKX Trading Report",
    totalAccounts: reportData.length,
    accounts: reportData.map((account) => {
      // Calculate PnL totals
      const pnl = {
        spot: {
          "BTC-USDT": calculateTotalPnL(account.trading.spot.btc.bills),
          "ETH-USDT": calculateTotalPnL(account.trading.spot.eth.bills),
        },
        perps: {
          "BTC-USDT-SWAP": calculateTotalPnL(
            account.trading.usdtSwap.btc.bills
          ),
          "ETH-USDT-SWAP": calculateTotalPnL(
            account.trading.usdtSwap.eth.bills
          ),
        },
        inverse: {
          "BTC-USD-SWAP": calculateTotalPnL(account.trading.coinSwap.btc.bills),
          "ETH-USD-SWAP": calculateTotalPnL(account.trading.coinSwap.eth.bills),
        },
      };

      // Format balances
      const balances =
        account.balances?.data?.[0]?.details?.map((bal) => ({
          ccy: bal.ccy,
          available: bal.availBal,
          frozen: bal.frozenBal,
        })) || [];

      return {
        user: {
          name: account.user.name,
          email: account.user.email,
          id: account.user.id,
          label: account.user.label,
        },
        summary: {
          reportDate: currentDate,
          balances: balances.map(
            (b) => `${b.ccy}: ${b.available} (Available) + ${b.frozen} (Frozen)`
          ),
          pnl: {
            spot: Object.entries(pnl.spot)
              .filter(([_, v]) => v !== 0)
              .map(([k, v]) => `${k}: ${v}`),
            perpetuals: Object.entries(pnl.perps)
              .filter(([_, v]) => v !== 0)
              .map(([k, v]) => `${k}: ${v}`),
            inversePerpetuals: Object.entries(pnl.inverse)
              .filter(([_, v]) => v !== 0)
              .map(([k, v]) => `${k}: ${v}`),
          },
          positions:
            account.positions?.data
              ?.filter((p) => parseFloat(p.pos) !== 0)
              ?.map(
                (p) => `${p.instId}: ${p.pos} @ ${p.avgPx} (PnL: ${p.upl})`
              ) || [],
        },
        // Keep original data
        accountInfo: account.accountInfo,
        balances: account.balances,
        positions: account.positions,
        trading: account.trading,
      };
    }),
  };

  // Save report
  fs.writeFileSync(reportFilename, JSON.stringify(formattedReport, null, 2));
  console.log(`Report saved to ${reportFilename}`);

  // Print summary
  formattedReport.accounts.forEach((account) => {
    console.log(`\n=== ${account.user.name} (${account.user.email}) ===`);
    console.log(`\nCurrent Balances (${account.summary.reportDate}):`);
    account.summary.balances.forEach((b) => console.log("  " + b));

    if (account.summary.pnl.spot.length) {
      console.log("\nSpot PnL:");
      account.summary.pnl.spot.forEach((p) => console.log("  " + p));
    }

    if (account.summary.pnl.perpetuals.length) {
      console.log("\nPerpetuals PnL:");
      account.summary.pnl.perpetuals.forEach((p) => console.log("  " + p));
    }

    if (account.summary.pnl.inversePerpetuals.length) {
      console.log("\nInverse Perpetuals PnL:");
      account.summary.pnl.inversePerpetuals.forEach((p) =>
        console.log("  " + p)
      );
    }

    if (account.summary.positions.length) {
      console.log("\nActive Positions:");
      account.summary.positions.forEach((p) => console.log("  " + p));
    }
  });

  // Generate CSV report
  const { spawn } = require("child_process");
  const processReport = spawn("node", ["process-report.js", reportFilename], {
    stdio: "inherit",
  });

  processReport.on("close", (code) => {
    if (code !== 0) {
      console.error("Error generating CSV report");
    }
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("Starting OKX billing script...");

    // Get all users with their API keys from database
    let usersWithApiKeys = [];

    try {
      // Try to get all users with their API keys from database
      usersWithApiKeys = await dbClient.getAllUsersWithApiKeys();

      if (usersWithApiKeys && usersWithApiKeys.length > 0) {
        console.log(
          `Found ${usersWithApiKeys.length} users with OKX API keys in the database`
        );
      } else {
        console.log("No users with OKX API keys found in database");
      }
    } catch (error) {
      console.error(`Error getting users with API keys: ${error.message}`);
    }

    // If no users with API keys found in database, use fallback
    if (usersWithApiKeys.length === 0) {
      console.log("Using fallback API credentials from environment variables");
      usersWithApiKeys = [
        {
          id: "unknown",
          name: "Unknown User",
          email: "unknown@example.com",
          api_key: process.env.API_KEY || API_KEY,
          secret_key: process.env.SECRET_KEY || SECRET_KEY,
          passphrase: process.env.PASSPHRASE || PASSPHRASE,
          exchange: "OKX",
          label: "Default API Key",
        },
      ];
    }

    // Create an array to store reports for each API key
    const allReports = [];

    // Process each user with API key
    for (let i = 0; i < usersWithApiKeys.length; i++) {
      const user = usersWithApiKeys[i];
      const credentials = {
        apiKey: user.api_key,
        secretKey: user.secret_key,
        passphrase: user.passphrase,
      };

      // Format user ID for display (mask all but last 4 characters)
      const displayUserId = user.id
        ? "******" + user.id.substring(user.id.length - 4)
        : "unknown";

      // Format API key for display (mask all but first 8 and last 4 characters)
      const displayApiKey = user.api_key
        ? user.api_key.substring(0, 8) +
          "..." +
          user.api_key.substring(user.api_key.length - 4)
        : "unknown";

      console.log(
        `\n=== PROCESSING USER ${i + 1}/${usersWithApiKeys.length} ===`
      );
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`User ID: ${displayUserId}`);
      console.log(`API Key: ${displayApiKey}`);
      console.log(`Label: ${user.label || "No Label"}`);

      if (
        !credentials.apiKey ||
        !credentials.secretKey ||
        !credentials.passphrase
      ) {
        console.log("Skipping API key with missing credentials");
        continue;
      }

      // Initialize report data object for this user
      const reportData = {
        user: {
          name: user.name,
          email: user.email,
          id: displayUserId,
          label: user.label || "No Label",
        },
        apiKey: displayApiKey,
        timestamp: new Date().toISOString(),
        accountInfo: null,
        balances: null,
        positions: null,
        trading: {
          spot: {
            btc: { bills: null },
            eth: { bills: null },
          },
          usdtSwap: {
            btc: { bills: null },
            eth: { bills: null },
          },
          coinSwap: {
            btc: { bills: null },
            eth: { bills: null },
          },
        },
      };

      try {
        // Check account configuration
        console.log("\n=== CHECKING ACCOUNT CONFIG ===");
        const accountConfig = await makeOkxApiRequest(
          credentials,
          "GET",
          "/api/v5/account/config"
        );
        console.log("Account Config:");
        console.log(JSON.stringify(accountConfig, null, 2));
        reportData.accountInfo = accountConfig;

        // Check account balance
        console.log("\n=== CHECKING ACCOUNT BALANCE ===");
        const accountBalance = await makeOkxApiRequest(
          credentials,
          "GET",
          "/api/v5/account/balance"
        );
        console.log("Account Balance:");
        console.log(JSON.stringify(accountBalance, null, 2));
        reportData.balances = accountBalance;

        // Check active positions
        const activePositions = await getActivePositions(credentials);
        reportData.positions = activePositions;

        // Get bills for each instrument type
        // SPOT TRADING
        reportData.trading.spot.btc.bills = await getBills(
          credentials,
          "BTC-USDT",
          "SPOT TRADING (BTC)"
        );
        reportData.trading.spot.eth.bills = await getBills(
          credentials,
          "ETH-USDT",
          "SPOT TRADING (ETH)"
        );

        // USDT-MARGINED PERPETUALS
        reportData.trading.usdtSwap.btc.bills = await getBills(
          credentials,
          "BTC-USDT-SWAP",
          "USDT-MARGINED PERPETUALS (BTC)"
        );
        reportData.trading.usdtSwap.eth.bills = await getBills(
          credentials,
          "ETH-USDT-SWAP",
          "USDT-MARGINED PERPETUALS (ETH)"
        );

        // COIN-MARGINED PERPETUALS
        reportData.trading.coinSwap.btc.bills = await getBills(
          credentials,
          "BTC-USD-SWAP",
          "COIN-MARGINED PERPETUALS (BTC)"
        );
        reportData.trading.coinSwap.eth.bills = await getBills(
          credentials,
          "ETH-USD-SWAP",
          "COIN-MARGINED PERPETUALS (ETH)"
        );

        // Add this report to the collection
        allReports.push(reportData);
      } catch (error) {
        console.error(
          `Error processing user ${user.name} (${displayUserId}): ${error.message}`
        );
        // Still add the report with whatever data we got
        allReports.push(reportData);
      }
    }

    // Generate combined report file
    await generateReport("okx_trading_report", allReports);

    console.log("\n=== SUMMARY ===");
    console.log(
      `Successfully processed ${allReports.length} users with API keys`
    );
    console.log(`Report saved with data from all accounts`);
  } catch (error) {
    console.error(`Error in main function: ${error.message}`);
  }
}

// Run the main function
main();
