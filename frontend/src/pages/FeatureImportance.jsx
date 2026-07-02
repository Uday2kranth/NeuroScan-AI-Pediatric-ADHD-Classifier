import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Sparkles, AlertCircle } from 'lucide-react'
import Card from '../components/Card'

export default function FeatureImportance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartHeight, setChartHeight] = useState(500)

  useEffect(() => {
    fetch('/api/feature-importance')
      .then(r => (r.ok ? r.json() : null))
      .then(fiData => {
        setData(fiData)
        setLoading(false)
        if (!fiData) setError('No feature importance data yet. Run python main.py first.')
      })
      .catch(() => {
        setError('No feature importance data yet. Run python main.py first.')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="page-header">
          <h1 className="page-title">Feature Importance</h1>
          <p className="page-subtitle">Top contributing features (Random Forest)</p>
        </div>
        <div className="skeleton" style={{ height: 500, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
      </div>
    )
  }

  if (!data && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="page-header">
          <h1 className="page-title">Feature Importance</h1>
          <p className="page-subtitle">Which EEG features are most discriminative for ADHD classification</p>
        </div>
        <Card style={{ borderColor: 'var(--accent-rose)', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={48} style={{ color: 'var(--accent-rose)' }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Feature Importance Data Unavailable</h3>
            <p style={{ maxWidth: 500, fontSize: 14, lineHeight: '1.6' }}>
              No feature importance rankings were found. Please ensure that the machine learning training pipeline has been completed successfully.
            </p>
            <div style={{ marginTop: 8, padding: '12px 20px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)', fontFamily: 'JetBrains Mono', fontSize: 12, textAlign: 'left', color: 'var(--text-primary)' }}>
              python main.py
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const entries = data ? Object.entries(data.feature_importances) : []
  const maxVal = entries.length > 0 ? Math.max(...entries.map(([, v]) => v)) : 1

  // Categorize features for insight
  const getCategory = (name) => {
    if (name.includes('theta_beta')) return { label: 'TBR', color: 'var(--accent-rose)' }
    if (
      name.includes('theta') || name.includes('delta') || name.includes('alpha') ||
      name.includes('beta') || name.includes('gamma')
    ) {
      return { label: 'Spectral', color: 'var(--accent-sky)' }
    }
    if (name.includes('coherence')) return { label: 'Connectivity', color: 'var(--accent-amber)' }
    if (name.includes('hjorth')) return { label: 'Hjorth', color: 'var(--accent-secondary)' }
    return { label: 'Time-domain', color: 'var(--accent-teal)' }
  }

  // Chart data: top 20 features in descending order
  const chartData = entries
    .slice(0, 20)
    .map(([name, val]) => ({
      name,
      Importance: parseFloat(val.toFixed(6)),
    }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <h1 className="page-title">Feature Importance</h1>
        <p className="page-subtitle">
          Which EEG features are most discriminative for ADHD classification
        </p>
      </div>

      {error && (
        <Card style={{ borderColor: 'var(--accent-rose)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-rose)' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        </Card>
      )}


      {/* Recharts vertical BarChart */}
      {entries.length > 0 && (
        <Card className="fade-in-slide fade-in-delay-1">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 className="card-title">
              <Sparkles size={18} /> Top 20 Contributing Features
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Height Sizing Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Height:</span>
                <button 
                  className={`btn btn-sm ${chartHeight === 400 ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 8px', fontSize: 10, borderRadius: '4px', minWidth: '24px' }}
                  onClick={() => setChartHeight(400)}
                >
                  S
                </button>
                <button 
                  className={`btn btn-sm ${chartHeight === 550 ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 8px', fontSize: 10, borderRadius: '4px', minWidth: '24px' }}
                  onClick={() => setChartHeight(550)}
                >
                  M
                </button>
                <button 
                  className={`btn btn-sm ${chartHeight === 700 ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 8px', fontSize: 10, borderRadius: '4px', minWidth: '24px' }}
                  onClick={() => setChartHeight(700)}
                >
                  L
                </button>
              </div>

              {data && (
                <span className="badge badge--info">
                  {data.total_features} total features
                </span>
              )}
            </div>
          </div>

          <div className="resizable-chart-container" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 10, right: 10, left: 40, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Outfit' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                  }}
                  itemStyle={{ color: '#F9FAFB', fontSize: 13, fontFamily: 'Outfit' }}
                  labelStyle={{ fontWeight: 600, color: '#F9FAFB', marginBottom: 4 }}
                />
                <Bar
                  dataKey="Importance"
                  fill="url(#colorPrimary)"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Feature List Table */}
      {entries.length > 0 && (
        <Card className="fade-in-slide fade-in-delay-2" noPadding={true}>
          <div className="card-header" style={{ padding: '24px 24px 0 24px', marginBottom: 16 }}>
            <h3 className="card-title">
              <Sparkles size={18} /> Detailed Feature Importances
            </h3>
          </div>

          <div style={{ padding: '0 24px 20px 24px' }}>
            {/* Category Legend */}
            <div className="feature-legend">
              {[
                { label: 'TBR (Theta/Beta Ratio)', color: 'var(--accent-rose)' },
                { label: 'Spectral Bands', color: 'var(--accent-sky)' },
                { label: 'Connectivity (Coherence)', color: 'var(--accent-amber)' },
                { label: 'Hjorth Parameters', color: 'var(--accent-secondary)' },
                { label: 'Time-domain', color: 'var(--accent-teal)' },
              ].map(cat => (
                <div key={cat.label} className="feature-legend-item">
                  <div className="feature-legend-color" style={{ background: cat.color }} />
                  <span className="feature-legend-label">{cat.label}</span>
                </div>
              ))}
            </div>

            <div className="results-table-wrap" style={{ marginTop: 12 }}>
              <table className="results-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Feature Name</th>
                    <th>Category</th>
                    <th style={{ width: '120px' }}>Importance</th>
                    <th>Relative Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 30).map(([name, value], idx) => {
                    const cat = getCategory(name)
                    const pct = (value / maxVal) * 100
                    return (
                      <tr key={name}>
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                          #{idx + 1}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {name}
                        </td>
                        <td>
                          <span 
                            className="badge" 
                            style={{ 
                              background: `${cat.color}20`, 
                              color: cat.color 
                            }}
                          >
                            {cat.label}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {value.toFixed(6)}
                        </td>
                        <td>
                          <div className="feature-inline-bar-track">
                            <div
                              className="feature-inline-bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, ${cat.color}, ${cat.color}99)`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {data && (
              <div className="feature-table-footer">
                Showing top 30 of {data.total_features} total features
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Insights Card */}
      {entries.length > 0 && (
        <Card className="fade-in-slide fade-in-delay-3">
          <div className="card-header">
            <h3 className="card-title">Biomarker Insights</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12 }}>
              • <strong style={{ color: 'var(--accent-rose)' }}>Theta/Beta Ratio (TBR)</strong>: Frontal channels (Fz, Fp1, Fp2) are critical indicators. A elevated TBR is the most established EEG biomarker for ADHD in children, representing relative hypo-arousal in the prefrontal cortex during visual attention task execution.
            </p>
            <p style={{ marginBottom: 12 }}>
              • <strong style={{ color: 'var(--accent-sky)' }}>Spectral Power Bands</strong>: Delta, theta, alpha, and beta powers quantify frequency-specific differences. High theta power paired with decreased beta power is the hallmark spectral signature of ADHD.
            </p>
            <p>
              • <strong style={{ color: 'var(--accent-amber)' }}>Inter-hemispheric Coherence</strong>: Coherence between symmetric left-right channels (e.g. F3-F4, P3-P4) captures functional connectivity networks. Significant deviations in coherence suggest abnormalities in hemispheric synchronization.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
