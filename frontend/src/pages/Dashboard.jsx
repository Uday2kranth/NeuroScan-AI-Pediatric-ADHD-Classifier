import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  Users, Activity, ShieldCheck, Zap, AlertCircle
} from 'lucide-react'
import Card from '../components/Card'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const [info, setInfo] = useState(null)
  const [status, setStatus] = useState(null)
  const [results, setResults] = useState(null)
  const [cmImage, setCmImage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dataset-info').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/status').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/results').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/confusion-matrix-base64').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([dataInfo, statusData, resultsData, cmData]) => {
      setInfo(dataInfo)
      setStatus(statusData)
      setResults(resultsData)
      if (cmData && cmData.image) {
        setCmImage(cmData.image)
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="skeleton" style={{ height: 104, gridColumn: 'span 1' }} />
        <div className="skeleton" style={{ height: 104, gridColumn: 'span 1' }} />
        <div className="skeleton" style={{ height: 104, gridColumn: 'span 1' }} />
        <div className="skeleton" style={{ height: 104, gridColumn: 'span 1' }} />
        <div className="skeleton" style={{ height: 320, gridColumn: 'span 2' }} />
        <div className="skeleton" style={{ height: 320, gridColumn: 'span 2' }} />
        <div className="skeleton" style={{ height: 60, gridColumn: 'span 4' }} />
      </div>
    )
  }

  // Find best performing model by subject-level mean accuracy
  let bestModelName = 'N/A'
  let bestModelMetrics = null
  const cvResults = results?.cv_results || results

  if (cvResults) {
    let maxAcc = -1
    for (const [name, modelData] of Object.entries(cvResults)) {
      const acc = modelData?.subject_metrics_mean?.accuracy || 0
      if (acc > maxAcc) {
        maxAcc = acc
        bestModelName = name
        bestModelMetrics = modelData?.subject_metrics_mean
      }
    }
  }

  const chartData = info ? [
    { name: 'ADHD', value: info?.adhd_subjects || 0 },
    { name: 'Control', value: info?.control_subjects || 0 }
  ] : []

  const handleExportPDF = () => {
    const element = document.getElementById('dashboard-report')
    const opt = {
      margin:       0.5,
      filename:     'NeuroScan_ADHD_Dashboard_Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0d1520' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    }
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save()
    } else {
      alert('PDF generation library is loading, please try again in a moment.')
    }
  }

  if (!info && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">ADHD EEG Classification Overview</p>
        </div>
        <Card style={{ borderColor: 'var(--accent-rose)', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={48} style={{ color: 'var(--accent-rose)' }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>FastAPI Backend Unavailable</h3>
            <p style={{ maxWidth: 500, fontSize: 14, lineHeight: '1.6' }}>
              The dashboard cannot retrieve data from the backend server. Please verify that the backend API is running and the model has been trained.
            </p>
            <div style={{ marginTop: 8, padding: '12px 20px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)', fontFamily: 'JetBrains Mono', fontSize: 12, textAlign: 'left', color: 'var(--text-primary)' }}>
              python run_project.py
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div id="dashboard-report" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">ADHD EEG Classification Overview</p>
        </div>
        <button 
          onClick={handleExportPDF} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 'fit-content' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Report PDF
        </button>
      </div>

      {/* Top row: 4 Stat Cards */}
      {info && (
        <div className="dashboard-grid">
          <StatCard
            icon={Users}
            label="Total Subjects"
            value={info?.total_subjects || 0}
            subtext="Pediatric ADHD Study"
            accentColor="var(--accent-primary)"
          />
          <StatCard
            icon={Activity}
            label="ADHD Subjects"
            value={info?.adhd_subjects || 0}
            subtext="Visual Attention Task"
            accentColor="var(--accent-rose)"
          />
          <StatCard
            icon={ShieldCheck}
            label="Control Subjects"
            value={info?.control_subjects || 0}
            subtext="Healthy Neurotypical"
            accentColor="var(--accent-teal)"
          />
          <StatCard
            icon={Zap}
            label="EEG Channels"
            value={info?.channels?.length || 0}
            subtext="10-20 Standard System"
            accentColor="var(--accent-amber)"
          />
        </div>
      )}

      {/* Second row: Subject Distribution & Best Model Summary */}
      <div className="dashboard-row-2">
        {/* Donut Chart */}
        <Card className="fade-in-slide fade-in-delay-1">
          <div className="card-header">
            <h3 className="card-title">
              <Activity size={18} /> Subject Distribution
            </h3>
          </div>
          <div style={{ position: 'relative', width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  <Cell fill="var(--accent-rose)" />
                  <Cell fill="var(--accent-teal)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center-text">
              <span className="donut-center-value">{info?.total_subjects || 0}</span>
              <span className="donut-center-label">Subjects</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-rose)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>ADHD ({info?.adhd_subjects || 0})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-teal)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Control ({info?.control_subjects || 0})</span>
            </div>
          </div>
        </Card>

        {/* Best Model Summary */}
        <Card className="fade-in-slide fade-in-delay-2">
          <div className="card-header">
            <h3 className="card-title">
              <AlertCircle size={18} /> Top Performing Model
            </h3>
            <span className="badge badge--success">Best Model</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Model Name</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{bestModelName}</div>
            </div>

            <div className="metrics-list">
              <div className="metric-row">
                <span className="metric-label">Accuracy</span>
                <span className="metric-value">
                  {bestModelMetrics ? `${((bestModelMetrics?.accuracy || 0) * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">F1 Score</span>
                <span className="metric-value">
                  {bestModelMetrics ? `${((bestModelMetrics?.f1 || 0) * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">AUC-ROC</span>
                <span className="metric-value">
                  {bestModelMetrics ? `${((bestModelMetrics?.auc_roc || 0) * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Confusion Matrix Integration */}
      {cmImage && (
        <div className="fade-in-slide fade-in-delay-3" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <Card>
            <div className="card-header" style={{ marginBottom: 12 }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} style={{ color: 'var(--accent-primary)' }} /> Test Set Confusion Matrix
              </h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 0', background: 'rgba(0, 0, 0, 0.2)', borderRadius: 'var(--radius-lg)', border: 'var(--border-subtle)' }}>
              <img 
                src={cmImage} 
                alt="Confusion Matrix" 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  maxHeight: '320px', 
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }} 
              />
            </div>
          </Card>
        </div>
      )}

      {/* Third row: System Status indicators */}
      {status && (
        <div className="status-indicator-bar fade-in-slide fade-in-delay-3">
          <div className="status-indicator">
            <div className={`status-dot ${status?.model_trained ? 'status-dot--active' : 'status-dot--inactive'}`} />
            <span>Model Trained</span>
          </div>
          <div className="status-indicator">
            <div className={`status-dot ${status?.results_available ? 'status-dot--active' : 'status-dot--inactive'}`} />
            <span>Results Available</span>
          </div>
          <div className="status-indicator">
            <div className={`status-dot ${status?.figures_available ? 'status-dot--active' : 'status-dot--inactive'}`} />
            <span>Figures Generated</span>
          </div>
        </div>
      )}
    </div>
  )
}
