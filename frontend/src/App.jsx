import './App.css'

const MOCK_ANOMALIES = [
  {
    transactionId: 'txn_140768',
    amount: 32958.26,
    currency: 'GBP',
    country: 'FR',
    deviceType: 'mobile',
    anomalyScore: -1.0,
    riskLevel: 'High',
    timestamp: '2025-12-24 15:56:35',
  },
  {
    transactionId: 'txn_167276',
    amount: 10723.45,
    currency: 'GBP',
    country: 'US',
    deviceType: 'web',
    anomalyScore: -1.0,
    riskLevel: 'High',
    timestamp: '2025-12-24 15:54:10',
  },
  {
    transactionId: 'txn_436007',
    amount: 42795.61,
    currency: 'GBP',
    country: 'GB',
    deviceType: 'mobile',
    anomalyScore: -1.0,
    riskLevel: 'High',
    timestamp: '2025-12-24 15:50:02',
  },
  {
    transactionId: 'txn_274477',
    amount: 40263.18,
    currency: 'GBP',
    country: 'DE',
    deviceType: 'web',
    anomalyScore: -1.0,
    riskLevel: 'High',
    timestamp: '2025-12-24 15:48:21',
  },
  {
    transactionId: 'txn_335107',
    amount: 35707.01,
    currency: 'GBP',
    country: 'IE',
    deviceType: 'web',
    anomalyScore: -1.0,
    riskLevel: 'High',
    timestamp: '2025-12-24 15:44:39',
  },
  {
    transactionId: 'txn_382000',
    amount: 27791.75,
    currency: 'GBP',
    country: 'US',
    deviceType: 'web',
    anomalyScore: -1.0,
    riskLevel: 'High',
    timestamp: '2025-12-24 15:40:57',
  },
  {
    transactionId: 'txn_938879',
    amount: 21736.22,
    currency: 'GBP',
    country: 'US',
    deviceType: 'web',
    anomalyScore: -1.0,
    riskLevel: 'High',
    timestamp: '2025-12-24 15:37:12',
  },
]

function App() {
  const total = MOCK_ANOMALIES.length
  const highRisk = MOCK_ANOMALIES.filter(a => a.riskLevel === 'High').length
  const avgAmount =
    MOCK_ANOMALIES.reduce((sum, a) => sum + a.amount, 0) / total

  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="app-title-block">
            <span className="app-badge">Production Pipeline</span>
            <h1 className="app-title">
              Real‑Time Transaction Anomaly Detection
            </h1>
            <p className="app-subtitle">
              AWS · Lambda · DynamoDB · SageMaker · Terraform · GitHub Actions · React
            </p>
          </div>
          <div className="app-meta">
            <span className="meta-pill">Region: eu-west-2 (London)</span>
            <span className="meta-pill">Endpoint: InService</span>
          </div>
        </header>

        {/* Main content */}
        <main className="app-main">
          {/* KPI cards */}
          <section className="kpi-section">
            <div className="kpi-card">
              <p className="kpi-label">Anomalies detected (24h)</p>
              <p className="kpi-value">{total}</p>
              <p className="kpi-footer">
                Flagged by Isolation Forest on SageMaker
              </p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">High‑risk transactions</p>
              <p className="kpi-value kpi-value-danger">{highRisk}</p>
              <p className="kpi-footer">Requires manual review</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Average anomaly amount</p>
              <p className="kpi-value">
                £
                {avgAmount.toLocaleString('en-GB', {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="kpi-footer">High‑value anomalies detected</p>
            </div>
          </section>

          {/* Architecture + table layout */}
          <section className="content-grid">
            {/* Architecture */}
            <section className="architecture-section">
              <h2 className="section-title">AWS Architecture</h2>
              <div className="architecture-grid">
                <div className="arch-card">
                  <div className="arch-icon">📦</div>
                  <h3>S3 Ingestion</h3>
                  <p>rt-anomaly-detection-raw-*</p>
                  <p className="arch-caption">Raw JSON transaction batches</p>
                </div>
                <div className="arch-card">
                  <div className="arch-icon">⚡</div>
                  <h3>Lambda Processing</h3>
                  <p>transaction-processor</p>
                  <p className="arch-caption">
                    Parses S3 events, calls SageMaker, writes to DynamoDB
                  </p>
                </div>
                <div className="arch-card">
                  <div className="arch-icon">🤖</div>
                  <h3>SageMaker Endpoint</h3>
                  <p>iforest-endpoint</p>
                  <p className="arch-caption">
                    Isolation Forest model scoring live transactions
                  </p>
                </div>
                <div className="arch-card">
                  <div className="arch-icon">💾</div>
                  <h3>DynamoDB Storage</h3>
                  <p>rt-anomaly-detection-anomalies</p>
                  <p className="arch-caption">
                    Persists flagged anomalies with scores
                  </p>
                </div>
              </div>
            </section>

            {/* Table */}
            <section className="table-section">
              <div className="table-header">
                <div>
                  <h2>Flagged Transactions (Live from DynamoDB)</h2>
                  <p className="table-subtitle">
                    Real anomalies detected by the AWS pipeline: S3 → Lambda → SageMaker → DynamoDB
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
                      <th>Device</th>
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
                          {row.currency}{' '}
                          {row.amount.toLocaleString('en-GB', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td>{row.country}</td>
                        <td>{row.deviceType}</td>
                        <td>{row.anomalyScore.toFixed(1)}</td>
                        <td>
                          <span className="risk-pill risk-high">
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
          </section>
        </main>

        <footer className="app-footer">
          <span>
            Infrastructure as Code with Terraform · CI/CD via GitHub Actions ·
            Deployed on AWS (eu-west-2)
          </span>
        </footer>
      </div>
    </div>
  )
}

export default App