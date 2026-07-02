import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Activity, Trophy, AlertCircle, FlaskConical, Settings, ZoomIn, ZoomOut, X, Maximize2, Minimize2, RefreshCw
} from 'lucide-react'
import Card from '../components/Card'

export default function ModelPerformance() {
  const [cvResults, setCvResults] = useState(null)
  const [testResults, setTestResults] = useState(null)
  const [figures, setFigures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal lightbox state
  const [activeImage, setActiveImage] = useState(null)
  const [scale, setScale] = useState(1.0)
  
  // Card size expansion state
  const [expandedCards, setExpandedCards] = useState({})

  // Interactive Sizing States
  const [chartHeight, setChartHeight] = useState(350)
  const [inlineZooms, setInlineZooms] = useState({})

  useEffect(() => {
    Promise.all([
      fetch('/api/results').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/figures').then(r => (r.ok ? r.json() : null)).catch(() => ({ figures: [] })),
    ]).then(([res, figs]) => {
      if (res) {
        setCvResults(res.cv_results || res)
        setTestResults(res.test_set_results || null)
      }
      const allowedModelFilenames = ['roc_comparison.png', 'cm_test_set.png']
      const modelFigs = (figs.figures || []).filter(f =>
        allowedModelFilenames.includes(f.filename)
      )
      setFigures(modelFigs)
      setLoading(false)
      if (!res) setError('No results yet. Run python main.py to train models.')
    })
  }, [])

  const toggleCardExpand = (idx) => {
    setExpandedCards(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  const handleOpenLightbox = (fig) => {
    setActiveImage(fig)
    setScale(1.0) // Reset scale on open
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="page-header">
          <h1 className="page-title">Model Metrics</h1>
          <p className="page-subtitle">Cross-validation and test set results</p>
        </div>
        <div className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 150, borderRadius: 'var(--radius-lg)' }} />
      </div>
    )
  }

  if (!cvResults && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="page-header">
          <h1 className="page-title">Model Metrics</h1>
          <p className="page-subtitle">Cross-validated results with subject-level evaluation (no data leakage)</p>
        </div>
        <Card style={{ borderColor: 'var(--accent-rose)', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={48} style={{ color: 'var(--accent-rose)' }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Model Performance Data Unavailable</h3>
            <p style={{ maxWidth: 500, fontSize: 14, lineHeight: '1.6' }}>
              No model results were found. Please ensure that the machine learning training pipeline has been completed successfully.
            </p>
            <div style={{ marginTop: 8, padding: '12px 20px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)', fontFamily: 'JetBrains Mono', fontSize: 12, textAlign: 'left', color: 'var(--text-primary)' }}>
              python main.py
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Find best model by F1 Score
  let bestModel = null
  if (cvResults) {
    let bestF1 = -1
    for (const [name, data] of Object.entries(cvResults)) {
      const f1 = data.subject_metrics_mean?.f1 || 0
      if (f1 > bestF1) {
        bestF1 = f1
        bestModel = name
      }
    }
  }

  const metricLabels = {
    accuracy: 'Accuracy',
    precision: 'Precision',
    recall: 'Recall',
    f1: 'F1 Score',
    auc_roc: 'AUC-ROC',
    kappa: "Cohen's K",
  }

  // Find best value in each column across all models for bolding
  const bestMetricValues = {}
  if (cvResults) {
    Object.keys(metricLabels).forEach(metric => {
      let maxVal = -1
      Object.values(cvResults).forEach(data => {
        const val = data.subject_metrics_mean?.[metric] || 0
        if (val > maxVal) {
          maxVal = val
        }
      })
      bestMetricValues[metric] = maxVal
    })
  }

  const formatMetricValue = (val) => {
    if (val === undefined || val === null) return '-'
    return `${(val * 100).toFixed(1)}%`
  }

  const formatMetric = (val, std) => {
    if (val === undefined || val === null) return '-'
    const v = (val * 100).toFixed(1)
    const s = std !== undefined ? ` ± ${(std * 100).toFixed(1)}%` : ''
    return `${v}%${s}`
  }

  // Prepare chart data (as percentages)
  const chartData = cvResults
    ? Object.entries(cvResults).map(([name, data]) => ({
        name,
        Accuracy: parseFloat(((data.subject_metrics_mean?.accuracy || 0) * 100).toFixed(1)),
        Precision: parseFloat(((data.subject_metrics_mean?.precision || 0) * 100).toFixed(1)),
        Recall: parseFloat(((data.subject_metrics_mean?.recall || 0) * 100).toFixed(1)),
        F1: parseFloat(((data.subject_metrics_mean?.f1 || 0) * 100).toFixed(1)),
      }))
    : []

  // Get cross-validation configuration details
  const totalFolds = cvResults ? Object.values(cvResults)[0]?.fold_results?.length || 5 : 5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <h1 className="page-title">Model Metrics</h1>
        <p className="page-subtitle">
          Cross-validated results with subject-level evaluation (no data leakage)
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

      {/* Grouped Bar Chart */}
      {cvResults && (
        <Card className="fade-in-slide fade-in-delay-1">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">
              <Activity size={18} /> Model Metric Comparison
            </h3>
            {/* Height Sizing Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Height:</span>
              <button 
                className={`btn btn-sm ${chartHeight === 300 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 8px', fontSize: 10, borderRadius: '4px', minWidth: '24px' }}
                onClick={() => setChartHeight(300)}
              >
                S
              </button>
              <button 
                className={`btn btn-sm ${chartHeight === 450 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 8px', fontSize: 10, borderRadius: '4px', minWidth: '24px' }}
                onClick={() => setChartHeight(450)}
              >
                M
              </button>
              <button 
                className={`btn btn-sm ${chartHeight === 600 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 8px', fontSize: 10, borderRadius: '4px', minWidth: '24px' }}
                onClick={() => setChartHeight(600)}
              >
                L
              </button>
            </div>
          </div>
          <div className="resizable-chart-container" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                barGap={4}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Outfit' }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 12, fontFamily: 'Outfit' }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    borderColor: 'rgba(255,255,255,0.08)', 
                    borderRadius: '10px' 
                  }} 
                  itemStyle={{ color: '#F9FAFB', fontSize: 13, fontFamily: 'Outfit' }}
                  labelStyle={{ fontWeight: 600, color: '#F9FAFB', marginBottom: 4 }}
                  formatter={(value) => [`${value}%`]}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: 16, fontFamily: 'Outfit', fontSize: 12 }} 
                  iconSize={10}
                  iconType="circle"
                />
                <Bar dataKey="Accuracy" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={14} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="Precision" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} barSize={14} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="Recall" fill="var(--accent-rose)" radius={[4, 4, 0, 0]} barSize={14} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="F1" fill="var(--accent-amber)" radius={[4, 4, 0, 0]} barSize={14} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* CV Results Table */}
      {cvResults && (
        <Card className="fade-in-slide fade-in-delay-2" noPadding={true}>
          <div className="card-header" style={{ padding: '24px 24px 0 24px', marginBottom: 16 }}>
            <h3 className="card-title">
              <Activity size={18} /> Subject-Level Metrics (Cross-Validation)
            </h3>
            <span className="badge badge--success">
              <Trophy size={12} style={{ marginRight: 4 }} /> Best: {bestModel}
            </span>
          </div>

          <div className="results-table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Model</th>
                  {Object.values(metricLabels).map(l => (
                    <th key={l}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(cvResults)
                  .sort((a, b) => (b[1]?.subject_metrics_mean?.accuracy || 0) - (a[1]?.subject_metrics_mean?.accuracy || 0))
                  .map(([name, data]) => (
                    <tr key={name}>
                      <td className="model-name">
                        {name}
                        {name === bestModel && <span className="best-badge" style={{ marginLeft: 8 }}>Best</span>}
                      </td>
                      {Object.keys(metricLabels).map(metric => {
                        const val = data?.subject_metrics_mean?.[metric]
                        const std = data?.subject_metrics_std?.[metric]
                        const isBest = val !== undefined && val === bestMetricValues[metric]
                        return (
                          <td key={metric} className={`metric-val ${isBest ? 'metric-high' : ''}`}>
                            {formatMetric(val, std)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Held-Out Test Set Results & CV Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* Test Set Results */}
        <Card className="fade-in-slide fade-in-delay-3" noPadding={true}>
          <div className="card-header" style={{ padding: '24px 24px 0 24px', marginBottom: 16 }}>
            <h3 className="card-title">
              <FlaskConical size={18} style={{ color: 'var(--accent-teal)' }} /> Unseen Held-Out Test Set
            </h3>
            {testResults && (
              <span className="badge badge--info">
                {testResults.test_subjects?.length || '?'} Subjects
              </span>
            )}
          </div>
          
          <div style={{ padding: '0 24px 24px 24px' }}>
            {testResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Evaluated using the top performing model: <strong style={{ color: 'var(--text-primary)' }}>{testResults.best_model}</strong>
                </div>
                <div className="metrics-list" style={{ marginTop: 8 }}>
                  {Object.entries(metricLabels).map(([key, label]) => {
                    const val = testResults.subject_metrics?.[key]
                    return (
                      <div className="metric-row" key={key}>
                        <span className="metric-label">{label}</span>
                        <span className="metric-value">{formatMetricValue(val)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                Test set results not available.
              </div>
            )}
          </div>
        </Card>

        {/* CV Config */}
        <Card className="fade-in-slide fade-in-delay-4">
          <div className="card-header">
            <h3 className="card-title">
              <Settings size={18} /> CV Configuration
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Validation Scheme</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>Stratified Group K-Fold</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Ensures zero data leakage between train/test subjects</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Folds Count</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>K = {totalFolds} Folds</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Decision Boundary</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>Subject-Level Majority Vote</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Aggregates predictions from all 2-second windows per subject</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Evaluation Figures */}
      {figures.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Pipeline Performance Plots</h2>
          <div className="figures-grid">
            {figures.map((fig, idx) => {
              const isExpanded = !!expandedCards[idx]
              const currentZoom = inlineZooms[idx] || 1.0
              return (
                <Card 
                  key={fig.filename} 
                  noPadding={true} 
                  className="fade-in-slide"
                  style={{ 
                    gridColumn: isExpanded ? 'span 2' : 'auto',
                    transition: 'grid-column 0.3s ease, border-color 0.25s, box-shadow 0.25s'
                  }}
                >
                  <div 
                    className="inline-zoom-container"
                    style={{ 
                      height: isExpanded ? 360 : 220,
                      cursor: currentZoom > 1.0 ? 'grab' : 'zoom-in'
                    }}
                    onClick={() => {
                      if (currentZoom === 1.0) {
                        handleOpenLightbox(fig)
                      }
                    }}
                  >
                    <img 
                      src={fig.url} 
                      alt={fig.title} 
                      className="inline-zoom-img" 
                      style={{ 
                        transform: `scale(${currentZoom})`,
                        width: currentZoom > 1.0 ? 'auto' : '100%',
                        height: currentZoom > 1.0 ? '85%' : '100%',
                      }}
                    />
                    {currentZoom === 1.0 && (
                      <div className="figure-zoom-overlay">
                        <div className="figure-zoom-icon-btn">
                          <ZoomIn size={20} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div 
                    className="figure-caption-bar"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
                  >
                    <span style={{ fontWeight: 600 }}>{fig.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Inline Zoom Controls */}
                      <div className="inline-zoom-toolbar">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInlineZooms(prev => ({
                              ...prev,
                              [idx]: Math.max(1.0, (prev[idx] || 1.0) - 0.25)
                            }))
                          }}
                          style={{ display: 'flex', padding: 4, borderRadius: '50%', color: 'var(--text-secondary)' }}
                          title="Zoom Out Inline"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span>{Math.round(currentZoom * 100)}%</span>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInlineZooms(prev => ({
                              ...prev,
                              [idx]: Math.min(3.0, (prev[idx] || 1.0) + 0.25)
                            }))
                          }}
                          style={{ display: 'flex', padding: 4, borderRadius: '50%', color: 'var(--text-secondary)' }}
                          title="Zoom In Inline"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setInlineZooms(prev => ({ ...prev, [idx]: 1.0 }))
                          }}
                          style={{ display: 'flex', padding: 4, borderRadius: '50%', color: 'var(--text-secondary)' }}
                          title="Reset Inline Zoom"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>

                      {/* Card grid expand button */}
                      <button 
                        className="btn-ghost btn-sm" 
                        onClick={(e) => { e.stopPropagation(); toggleCardExpand(idx); }}
                        style={{ display: 'flex', padding: 4, borderRadius: '50%', color: 'var(--text-secondary)' }}
                        title={isExpanded ? "Collapse to Grid" : "Expand Card Width"}
                      >
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Overlay */}
      {activeImage && (
        <div className="lightbox-backdrop" onClick={() => setActiveImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setActiveImage(null)}>
              <X size={20} />
            </button>
            <div 
              className="lightbox-img-wrapper"
              style={{ overflow: 'auto', maxWidth: '85vw', maxHeight: '70vh', background: '#000', borderRadius: 'var(--radius-lg)' }}
            >
              <img 
                src={activeImage.url} 
                alt={activeImage.title} 
                className="lightbox-img" 
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease',
                  display: 'block'
                }}
              />
            </div>
            
            {/* Zoom Controls Toolbar */}
            <div 
              style={{ 
                display: 'flex', 
                gap: 12, 
                marginTop: 4, 
                background: 'rgba(0, 0, 0, 0.6)', 
                padding: '8px 20px', 
                borderRadius: '9999px',
                border: 'var(--border-subtle)',
                alignItems: 'center'
              }}
            >
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                style={{ display: 'flex', padding: 6, color: 'white' }}
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span style={{ fontSize: 13, color: 'white', fontWeight: 600, minWidth: 48, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                {Math.round(scale * 100)}%
              </span>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setScale(s => Math.min(3.0, s + 0.25))}
                style={{ display: 'flex', padding: 6, color: 'white' }}
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setScale(1.0)}
                style={{ display: 'flex', padding: 6, color: 'white' }}
                title="Reset Zoom"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            <div className="lightbox-caption">{activeImage.title}</div>
          </div>
        </div>
      )}
    </div>
  )
}
