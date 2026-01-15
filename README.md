# MA Civic Tracker

A civic transparency tool for monitoring Massachusetts and Boston government spending, identifying anomalies, and helping citizens engage with their representatives.

## Features

- **Boston Spending Dashboard** - Explore city checkbook data from Analyze Boston
- **Massachusetts State Spending** - Track state-level expenditures and contracts
- **Anomaly Detection** - Automated flagging of unusual spending patterns
- **Representative Finder** - Look up your elected officials
- **Public Meetings** - Find upcoming government meetings

## Data Sources

- [Analyze Boston](https://data.boston.gov) - Boston's open data portal
- [MA Open Checkbook](https://cthru.data.socrata.com/) - Massachusetts state spending
- [Mass.gov Open Data](https://www.mass.gov/topics/open-data) - State government data

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ma-civic-tracker.git
cd ma-civic-tracker

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
npm run build
npm start
```

## Deploy to Netlify

1. Push this repo to GitHub
2. Connect to Netlify:
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your GitHub repo
   - Netlify will auto-detect the Next.js configuration
3. Deploy!

The `netlify.toml` file is already configured for deployment.

## Optional API Keys

For enhanced functionality, you can add these API keys:

- **Google Civic Information API** - For representative lookup by address
- **OpenStates API** - For detailed legislator data and voting records

Add these as environment variables in Netlify or a `.env.local` file.

## Anomaly Detection Methods

The tool automatically flags:

- **Large Payments** - Individual transactions over $1 million
- **Round Number Patterns** - Vendors receiving multiple exact round-figure payments
- **High Frequency Payments** - Vendors with unusually many separate transactions
- **Spending Concentration** - Departments with disproportionate budget shares

## Contributing

Contributions are welcome! This is a civic transparency project aimed at helping Massachusetts residents understand and monitor government spending.

## Disclaimer

This tool aggregates publicly available data for informational purposes. Flagged anomalies are statistical patterns and do not indicate wrongdoing. Always verify findings with official sources before drawing conclusions.

## License

MIT
