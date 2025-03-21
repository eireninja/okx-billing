/**
 * @fileoverview Process OKX trading reports and generate CSV billing summaries.
 * This script takes a JSON trading report as input and generates a CSV file containing
 * account balances, PnL data, and fee calculations. All timestamps are in Irish time.
 */

const fs = require("fs");
const path = require("path");

/**
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Path to directory
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Process an OKX trading report and generate a CSV billing summary
 * @param {string} reportPath - Path to the JSON report file
 * @throws {Error} If the report file cannot be read or parsed
 */
function processReport(reportPath) {
  // Read and parse the report
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

  // Create CSV content
  const lines = [];

  // Format date and time
  const reportDate = new Date(report.timestamp);
  const formattedDate = reportDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Dublin",
  });
  const formattedTime = reportDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Dublin",
  });

  // Create dated folder
  const [day, month, year] = formattedDate.split("/");
  const folderName = `reports_output_${day}_${month}_${year}`;
  const outputDir = path.join(__dirname, folderName);
  ensureDirectoryExists(outputDir);

  // Add header
  lines.push(
    "date,time_irish,name,email,spot_pnl,perps_pnl,invperps_pnl,btc_equity,btc_usd_value,btc_available,eth_equity,eth_usd_value,eth_available,usdt_equity,usdt_usd_value,usdt_available,perps_fee,invperps_fee"
  );

  // Process each account
  report.accounts.forEach((account) => {
    // Extract user info
    const name = account.user?.name || "Unknown";
    const email = account.user?.email || "Unknown";

    // Extract PnL values
    const spotPnL =
      account.summary?.pnl?.spot?.length > 0
        ? account.summary.pnl.spot.reduce(
            (sum, pnl) => sum + parseFloat(pnl.split(": ")[1]),
            0
          )
        : 0;

    const perpsPnL =
      account.summary?.pnl?.perpetuals?.length > 0
        ? account.summary.pnl.perpetuals.reduce(
            (sum, pnl) => sum + parseFloat(pnl.split(": ")[1]),
            0
          )
        : 0;

    const invPerpsPnL =
      account.summary?.pnl?.inversePerpetuals?.length > 0
        ? account.summary.pnl.inversePerpetuals.reduce(
            (sum, pnl) => sum + parseFloat(pnl.split(": ")[1]),
            0
          )
        : 0;

    // Calculate 25% fees (only on positive PnL)
    const perpsFee = perpsPnL > 0 ? perpsPnL * 0.25 : 0;
    const invPerpsFee = invPerpsPnL > 0 ? invPerpsPnL * 0.25 : 0;

    // Extract balances
    const details = account.balances?.data?.[0]?.details || [];
    const btcDetails = details.find((b) => b.ccy === "BTC") || {};
    const ethDetails = details.find((b) => b.ccy === "ETH") || {};
    const usdtDetails = details.find((b) => b.ccy === "USDT") || {};

    // Create CSV line
    const csvLine = [
      formattedDate,
      formattedTime,
      name,
      email,
      spotPnL.toFixed(8),
      perpsPnL.toFixed(8),
      invPerpsPnL.toFixed(8),
      btcDetails.eq || "0",
      btcDetails.eqUsd || "0",
      btcDetails.availBal || "0",
      ethDetails.eq || "0",
      ethDetails.eqUsd || "0",
      ethDetails.availBal || "0",
      usdtDetails.eq || "0",
      usdtDetails.eqUsd || "0",
      usdtDetails.availBal || "0",
      perpsFee.toFixed(8),
      invPerpsFee.toFixed(8),
    ].join(",");

    lines.push(csvLine);
  });

  // Write CSV file to dated folder
  const csvPath = path.join(
    outputDir,
    `okx_pnl_report_${reportDate.toISOString().replace(/:/g, "-")}.csv`
  );
  fs.writeFileSync(csvPath, lines.join("\n"));
  console.log(`CSV report written to: ${csvPath}`);

  // Move JSON report to dated folder
  const jsonFileName = path.basename(reportPath);
  const jsonDestPath = path.join(outputDir, jsonFileName);
  fs.renameSync(reportPath, jsonDestPath);
  console.log(`JSON report moved to: ${jsonDestPath}`);

  return csvPath;
}

// Get report path from command line argument
const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Please provide the report path as an argument");
  process.exit(1);
}

processReport(reportPath);
