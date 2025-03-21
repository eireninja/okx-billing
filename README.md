# OKX Billing Report Generator

A robust Node.js application for generating detailed billing reports from OKX trading activity. This tool fetches trading data across spot and perpetual markets, calculates PnL and fees, and generates comprehensive CSV reports.

## 🌟 Features

- **Multi-Market Support**

  - Spot trading (e.g., BTC-USDT)
  - USDT-margined perpetuals (e.g., BTC-USDT-SWAP)
  - Coin-margined perpetuals (e.g., BTC-USD-SWAP)

- **Detailed Financial Reporting**

  - Account balances for BTC, ETH, and USDT
  - Spot and perpetual trading PnL
  - Trading fees and commissions
  - USD-denominated valuations
  - 25% profit share calculations

- **Data Management**
  - Cloudflare D1 database integration
  - Secure API key storage
  - Historical report archiving

## 📋 Prerequisites

- Node.js v16.0.0 or higher
- Cloudflare account with D1 database
- OKX API credentials with read permissions

## 🚀 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/eireninja/okx-billing.git
   cd okx-billing
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:

   ```env
   # Cloudflare Configuration
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_DATABASE_ID=your_database_id
   CLOUDFLARE_API_TOKEN=your_api_token

   # Optional: Direct OKX API Configuration
   API_KEY=your_okx_api_key
   SECRET_KEY=your_okx_secret_key
   PASSPHRASE=your_okx_passphrase
   ```

## 💻 Usage

### Generate Billing Report

```bash
node billing.js
```

This will:

1. Fetch trading data from OKX
2. Calculate PnL and fees
3. Generate two files:
   - `okx_trading_report_[timestamp].json`: Raw trading data
   - `okx_pnl_report_[timestamp].csv`: Processed billing report

### CSV Report Format

The CSV report includes:

- Date (DD-MM-YYYY)
- Time (HH:MM, Irish timezone)
- Account holder details
- PnL breakdown last 30 days total for:
  - Spot trading
  - USDT perpetuals
  - Inverse perpetuals
- Account balances:
  - BTC (equity, USD value, available)
  - ETH (equity, USD value, available)
  - USDT (equity, USD value, available)
- Fee calculations:
  - 25% of perpetual PnL
  - 25% of inverse perpetual PnL

### Test Database Connection

```bash
node test-db.js
```

### Test Bills Endpoint

```bash
node test-bills.js
```

## 📅 Billing Period

- Reports are generated for the current day's trading activity
- All timestamps are in Irish time (Europe/Dublin timezone)
- Historical data is preserved in both JSON and CSV formats

## 🔒 Security

- API keys are stored securely in Cloudflare D1 database
- Sensitive data is masked in logs and test output
- Environment variables are used for all credentials
- Generated reports are added to version control for tracking

## 🛠 Development

### Project Structure

```
billing/
├── billing.js         # Main billing script
├── database.js        # Cloudflare D1 client
├── process-report.js  # Report processing logic
├── test-bills.js     # Bills endpoint testing
├── test-db.js        # Database connection testing
└── .env              # Environment configuration
```

## 📝 License

MIT License - see LICENSE file for details
