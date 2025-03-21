# OKX Trading Report Generator

This system generates detailed trading reports and billing information from OKX accounts. It produces both a detailed JSON report and a CSV billing summary.

## Features

- Fetches trading data from OKX API for multiple accounts
- Tracks PnL across different trading types:
  - Spot Trading (BTC-USDT, ETH-USDT)
  - USDT-Margined Perpetuals (BTC-USDT-SWAP, ETH-USDT-SWAP)
  - Coin-Margined Perpetuals (BTC-USD-SWAP, ETH-USD-SWAP)
- Calculates 25% fee on positive PnL for perpetuals trading
- Monitors balances for BTC, ETH, and USDT
- Outputs timestamps in Irish time (Europe/Dublin timezone)

## Output Files

### 1. JSON Report (`okx_trading_report_[timestamp].json`)
Detailed report containing:
- Account configurations
- Current balances
- Active positions
- Trading history
- PnL calculations
- User information

### 2. CSV Report (`okx_pnl_report_[timestamp].csv`)
Billing summary with columns:
- `date` - DD/MM/YYYY in Irish time
- `time` - HH:MM in Irish time (24-hour format)
- `name` - Account holder name
- `email` - Account email
- `spot_pnl` - Spot trading PnL
- `perps_pnl` - USDT-margined perpetuals PnL
- `invperps_pnl` - Coin-margined perpetuals PnL
- `btc_equity` - Total BTC balance
- `btc_usd_value` - BTC value in USD
- `btc_available` - Available BTC balance
- `eth_equity` - Total ETH balance
- `eth_usd_value` - ETH value in USD
- `eth_available` - Available ETH balance
- `usdt_equity` - Total USDT balance
- `usdt_usd_value` - USDT value in USD
- `usdt_available` - Available USDT balance
- `perps_fee` - 25% fee on positive USDT-margined perpetuals PnL
- `invperps_fee` - 25% fee on positive coin-margined perpetuals PnL

## Usage

1. Ensure environment variables are set in `.env`:
   ```
   DATABASE_URL=your_database_url
   ```

2. Run the billing script:
   ```bash
   node billing.js
   ```

The script will:
1. Fetch user data and API keys from the database
2. Retrieve trading data from OKX for each account
3. Generate detailed JSON report
4. Generate CSV billing summary
5. Display verbose output in the console

## Dependencies

- Node.js
- OKX API access
- Database with user API keys
- Required Node modules (install via `npm install`):
  - `fs`
  - `path`
  - `child_process`
