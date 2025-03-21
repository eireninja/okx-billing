const fs = require("fs");
const path = require("path");

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

  // Generate output filename based on report timestamp
  const timestamp = report.timestamp.replace(/:/g, "-").replace(/\./g, "-");
  const outputPath = path.join(
    path.dirname(reportPath),
    `okx_pnl_report_${timestamp}.csv`
  );

  // Write to CSV file
  fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
  console.log(`CSV report generated: ${outputPath}`);
}

// Get report path from command line argument
const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Please provide the report path as an argument");
  process.exit(1);
}

processReport(reportPath);
