import './App.css'

const MOCK_ANOMALIES = [
  {
    transactionId: 'tx_1A2B3C4D',
    amount: 259.99,
    currency: 'GBP',
    country: 'GB',
    merchant: 'Online Electronics',
    score: 0.97,
    riskLevel: 'High',
    timestamp: '2025-12-20 14:32:10',
  },
  {
    transactionId: 'tx_9Z8Y7X6W',
    amount: 1200.0,
    currency: 'GBP',
    country: 'US',
    merchant: 'Travel Booking',
    score: 0.91,
    riskLevel: 'High',
    timestamp: '2025-12-20 13:48:02',
  },
  {
    transactionId: 'tx_5P6Q7R8S',
    amount: 49.5,
    currency: 'GBP',
    country: 'GB',
    merchant: 'Food Delivery',
    score: 0.78,
    riskLevel: 'Medium',
    timestamp: '2025-12-20 13:10:45',
  },
  {
    transactionId: 'tx_7L8M9N0O',
    amount: 310.25,
    currency: 'GBP',
    country: 'DE',
    merchant: 'Fashion Retail',
    score: 0.82,
    riskLevel: 'Medium',
    timestamp: '2025-12-20 12:55:18',
  },
]

function App() {
  const total = MOCK_ANOMALIES.length
  const highRisk = MOCK_ANOMALIES.filter(a => a.riskLevel === 'High').length
  const avgScore =
    MOCK_ANOMALIES.reduce((sum, a) => sum + a.score, 0) / total

  return (
    <div className="app-root">
      {/* Top navigation / header */}
      <header className="app-header">
        <div className="app-title-block">
          <span className="app-badge">Side Project</span>
          <h1 className="app-title">
            Real‑Time Transaction Anomaly Detection
          </h1>
          <p className="app-subtitle">
            AWS · Lambda · DynamoDB · SageMaker · Terraform · React
          </p>
        </div>
        <div className="app-meta">
          <span className="meta-pill">Region: eu-west-2 (London)</span>
          <span className="meta-pill">Environment: Demo</span>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {/* KPI cards */}
        <section className="kpi-section">
          <div className="kpi-card">
            <p className="kpi-label">Total anomalies</p>
            <p className="kpi-value">{total}</p>
            <p className="kpi-footer">Flagged by Isolation Forest</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">High risk</p>
            <p className="kpi-value kpi-value-danger">{highRisk}</p>
            <p className="kpi-footer">Requires manual review</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-label">Average anomaly score</p>
            <p className="kpi-value">
              {avgScore.toFixed(2)}
            </p>
            <p className="kpi-footer">0 = normal · 1 = highly anomalous</p>
          </div>
        </section>

        {/* Table */}
        <section className="table-section">
          <div className="table-header">
            <div>
              <h2>Flagged Transactions (Mock Data)</h2>
              <p className="table-subtitle">
                This dashboard currently uses sample data. In the full
                version, rows are streamed from the Lambda + DynamoDB
                pipeline on AWS.
              </p>
            </div>
            <div className="table-controls">
              <button className="btn-secondary" type="button">
                Refresh
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="anomaly-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Country</th>
                  <th>Merchant</th>
                  <th>Anomaly score</th>
                  <th>Risk</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ANOMALIES.map(row => (
                  <tr key={row.transactionId}>
                    <td className="mono">{row.transactionId}</td>
                    <td>
                      {row.currency} {row.amount.toFixed(2)}
                    </td>
                    <td>{row.country}</td>
                    <td>{row.merchant}</td>
                    <td>{row.score.toFixed(2)}</td>
                    <td>
                      <span
                        className={
                          'risk-pill ' +
                          (row.riskLevel === 'High'
                            ? 'risk-high'
                            : 'risk-medium')
                        }
                      >
                        {row.riskLevel}
                      </span>
                    </td>
                    <td>{row.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>
          Built with AWS (S3, Lambda, DynamoDB, SageMaker), Terraform, and
          React + Vite.
        </span>
      </footer>
    </div>
  )
}

export default App