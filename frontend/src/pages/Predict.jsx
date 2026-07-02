import { useState, useRef, useEffect } from 'react'
import {
  Upload, SlidersHorizontal, RefreshCw, Zap, Loader2, XCircle, CheckCircle, X, AlertCircle
} from 'lucide-react'
import Card from '../components/Card'

const CHANNELS = [
  'Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4',
  'O1', 'O2', 'F7', 'F8', 'T7', 'T8', 'P7', 'P8',
  'Fz', 'Cz', 'Pz'
]

const CHANNEL_RANGE = { min: -3000, max: 3000 }

export default function Predict({ 
  tab: controlledTab, 
  setTab: controlledSetTab, 
  modelTrained, 
  triggerStatusRefresh, 
  onNavigate, 
  setChatOpen,
  file: propFile,
  setFile: propSetFile,
  sliderValues: propSliderValues,
  setSliderValues: propSetSliderValues,
  result: propResult,
  setResult: propSetResult,
  error: propError,
  setError: propSetError
}) {
  const [internalTab, setInternalTab] = useState('sliders')
  const tab = controlledTab !== undefined ? controlledTab : internalTab
  const setTab = controlledSetTab !== undefined ? controlledSetTab : setInternalTab

  const [localFile, setLocalFile] = useState(null)
  const [localResult, setLocalResult] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [localSliderValues, setLocalSliderValues] = useState({})

  const file = propFile !== undefined ? propFile : localFile
  const setFile = propSetFile !== undefined ? propSetFile : setLocalFile
  const result = propResult !== undefined ? propResult : localResult
  const setResult = propSetResult !== undefined ? propSetResult : setLocalResult
  const error = propError !== undefined ? propError : localError
  const setError = propSetError !== undefined ? propSetError : setLocalError
  const sliderValues = propSliderValues !== undefined ? propSliderValues : localSliderValues
  const setSliderValues = propSetSliderValues !== undefined ? propSetSliderValues : setLocalSliderValues

  const [dragging, setDragging] = useState(false)
  const [classifyLoading, setClassifyLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [sessionResetLoading, setSessionResetLoading] = useState(false)
  const [showUploadZone, setShowUploadZone] = useState(true)
  const fileInputRef = useRef(null)

  // Clamp helper to ensure values match slider bounds
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

  // Fetch initial sample values
  useEffect(() => {
    if (sliderValues && Object.keys(sliderValues).length > 0) return

    fetch('/api/sample-values')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && data.values) {
          const clampedValues = {}
          CHANNELS.forEach(ch => {
            clampedValues[ch] = clamp(data.values[ch] || 0, CHANNEL_RANGE.min, CHANNEL_RANGE.max)
          })
          setSliderValues(clampedValues)
        } else {
          const zeros = {}
          CHANNELS.forEach(ch => { zeros[ch] = 0 })
          setSliderValues(zeros)
        }
      })
      .catch(() => {
        const zeros = {}
        CHANNELS.forEach(ch => { zeros[ch] = 0 })
        setSliderValues(zeros)
      })
  }, [])

  const handleSliderChange = (channel, value) => {
    setSliderValues(prev => ({ ...prev, [channel]: parseFloat(value) }))
  }

  const handleRandomize = () => {
    setClassifyLoading(true)
    fetch('/api/sample-values?random=true')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && data.values) {
          const clampedValues = {}
          CHANNELS.forEach(ch => {
            clampedValues[ch] = clamp(data.values[ch] || 0, CHANNEL_RANGE.min, CHANNEL_RANGE.max)
          })
          setSliderValues(clampedValues)
        }
        setClassifyLoading(false)
      })
      .catch(() => {
        // Fallback local randomizer within bounds
        const randomVals = {}
        CHANNELS.forEach(ch => {
          randomVals[ch] = parseFloat((Math.random() * (CHANNEL_RANGE.max - CHANNEL_RANGE.min) + CHANNEL_RANGE.min).toFixed(2))
        })
        setSliderValues(randomVals)
        setClassifyLoading(false)
      })
    setResult(null)
    setError(null)
  }

  const handlePredictSliders = async () => {
    setClassifyLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/predict-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: sliderValues }),
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Prediction failed')
      }
      const data = await response.json()
      setResult(data)
      try {
        localStorage.setItem('neuroscan_simulator_state', JSON.stringify({
          mode: 'sliders',
          inputs: sliderValues,
          result: data,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.error('Failed to save state to localStorage', e)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setClassifyLoading(false)
    }
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile)
      setError(null)
      setResult(null)
    } else {
      setError('Please select a valid CSV file.')
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handlePredictFile = async () => {
    if (!file) return
    setClassifyLoading(true)
    setError(null)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        let errMsg = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errData = await response.json()
          errMsg = errData.detail || errMsg
        } catch (_) {
          // response body is not JSON (e.g. HTML error page)
        }
        throw new Error(errMsg)
      }
      const data = await response.json()
      setResult(data)
      try {
        localStorage.setItem('neuroscan_simulator_state', JSON.stringify({
          mode: 'upload',
          filename: file.name,
          result: data,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.error('Failed to save state to localStorage', e)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setClassifyLoading(false)
    }
  }

  const resetAll = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setShowUploadZone(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <h1 className="page-title">Predict</h1>
        <p className="page-subtitle">Classify EEG data as ADHD or Control</p>
      </div>

      {/* Tab Switcher */}
      {!result && (
        <div className="tab-bar">
          <button
            className={`tab-btn ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => { setTab('upload'); resetAll() }}
          >
            Upload CSV
          </button>
          <button
            className={`tab-btn ${tab === 'sliders' ? 'active' : ''}`}
            onClick={() => { setTab('sliders'); resetAll() }}
          >
            Manual Input
          </button>
        </div>
      )}

      {/* Manual Input (Sliders) View */}
      {tab === 'sliders' && !result && (
        <Card className="fade-in-slide">
          <div className="card-header">
            <h3 className="card-title">
              <SlidersHorizontal size={18} /> EEG Channel Sliders
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={handleRandomize} disabled={classifyLoading}>
              <RefreshCw size={14} className={classifyLoading ? 'spinner-icon' : ''} />
              Load Random Sample
            </button>
          </div>

          <div className="slider-grid">
            {CHANNELS.map(ch => (
              <div key={ch} className="slider-item">
                <div className="slider-label">
                  <span className="slider-channel">{ch}</span>
                  <span className="slider-value">{(sliderValues[ch] || 0).toFixed(2)} μV</span>
                </div>
                <div className="slider-input-container">
                  <input
                    type="range"
                    className="slider"
                    min={CHANNEL_RANGE.min}
                    max={CHANNEL_RANGE.max}
                    step="0.01"
                    value={sliderValues[ch] || 0}
                    onChange={(e) => handleSliderChange(ch, e.target.value)}
                  />
                </div>
                <div className="slider-range">
                  <span>{CHANNEL_RANGE.min}</span>
                  <span>{CHANNEL_RANGE.max}</span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)', marginTop: 20 }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          <div className="predict-action-row">
            <button className="btn btn-primary" onClick={handlePredictSliders} disabled={classifyLoading}>
              {classifyLoading ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  Classifying...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Classify
                </>
              )}
            </button>
          </div>
        </Card>
      )}
      {/* CSV Upload View */}
      {tab === 'upload' && !result && (
        modelTrained && !showUploadZone ? (
          <Card className="fade-in-slide" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(0, 191, 165, 0.1)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={32} />
              </div>
              
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Active Dataset Session
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 450, margin: '6px auto 0 auto' }}>
                  The machine learning classification pipeline is trained and loaded. You can upload a new CSV directly, or reset this session to clear all model files.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowUploadZone(true)}
                  style={{ height: 44, padding: '0 24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Upload size={16} />
                  Upload New CSV
                </button>

                <button 
                  className="btn btn-primary" 
                  onClick={async () => {
                    setSessionResetLoading(true)
                    try {
                      await fetch('/api/reset-session', { method: 'POST' })
                      if (triggerStatusRefresh) await triggerStatusRefresh()
                    } catch (e) {
                      console.error(e)
                    } finally {
                      setSessionResetLoading(false)
                    }
                  }}
                  style={{ 
                    background: 'var(--accent-rose)', 
                    borderColor: 'var(--accent-rose)',
                    height: 44,
                    padding: '0 24px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  disabled={sessionResetLoading}
                >
                  {sessionResetLoading ? <Loader2 size={16} className="spinner-icon" /> : null}
                  Reset Session & Clear Model
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="fade-in-slide">
            {showUploadZone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowUploadZone(false)}>
                  ← Back to Session Hub
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading a new file will run prediction without clearing the trained model.</span>
              </div>
            )}
            <div
              className={`upload-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={40} />
              <div className="upload-primary-text">
                Drag &amp; drop EEG CSV or click to browse
              </div>
              <div className="upload-hint-text">
                .csv files with 19 EEG channel columns (Fp1, Fp2, F3, etc.)
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {/* Quick Demo Data Loader Option */}
            {!showUploadZone && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Or quickly load the pre-included sample dataset
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={async () => {
                    setDemoLoading(true)
                    try {
                      await fetch('/api/load-sample', { method: 'POST' })
                      if (triggerStatusRefresh) await triggerStatusRefresh()
                      setTab('sliders')
                    } catch (e) {
                      console.error(e)
                    } finally {
                      setDemoLoading(false)
                    }
                  }}
                  disabled={demoLoading}
                >
                  {demoLoading ? <Loader2 size={14} className="spinner-icon" /> : null}
                  Load Demo Dataset
                </button>
              </div>
            )}

            {file && (
              <div className="file-selected-indicator">
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                  Selected: {file.name} ({ (file.size / 1024).toFixed(1) } KB)
                </span>
                <button className="remove-file-btn" onClick={resetAll}>
                  <X size={16} />
                </button>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)', marginTop: 20 }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: 13 }}>{error}</span>
              </div>
            )}

            <div className="predict-action-row">
              {file && (
                <button className="btn btn-secondary" onClick={resetAll} disabled={classifyLoading}>
                  Clear
                </button>
              )}
              <button className="btn btn-primary" onClick={handlePredictFile} disabled={!file || classifyLoading}>
                {classifyLoading ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    Classifying...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Classify EEG
                  </>
                )}
              </button>
            </div>
          </Card>
        )
      )}

      {/* Prediction Results Display */}
      {result && (
        <>
          <div className="predict-results-grid fade-in-slide">
          {/* Result Card Left */}
          <Card className={`predict-result-card-left ${result?.prediction?.toLowerCase() || ''}`}>
            <span className="predict-result-caption">Classification Result</span>
            <h2 className={`predict-result-value ${result?.prediction?.toLowerCase() || ''}`}>
              {result?.prediction || 'N/A'}
            </h2>
            <div className="predict-result-confidence">
              Confidence: { ((result?.confidence || 0) * 100).toFixed(1) }%
            </div>
          </Card>

          {/* Confidence Breakdown Card Right */}
          <Card>
            <h3 className="card-title" style={{ marginBottom: 16 }}>
              Confidence Breakdown
            </h3>
            
            {result?.total_windows !== undefined ? (
              // CSV upload output: show stacked windows breakdown
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  EEG window-level classification summary:
                </span>
                
                <div className="stacked-progress-bar-container">
                  <div 
                    className="stacked-progress-portion adhd" 
                    style={{ width: `${((result?.adhd_windows || 0) / (result?.total_windows || 1)) * 100}%` }}
                  />
                  <div 
                    className="stacked-progress-portion control" 
                    style={{ width: `${((result?.control_windows || 0) / (result?.total_windows || 1)) * 100}%` }}
                  />
                </div>
                
                <div className="progress-bar-legend">
                  <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                    ADHD: {result?.adhd_windows || 0} ({ (((result?.adhd_windows || 0) / (result?.total_windows || 1)) * 100).toFixed(0) }%)
                  </span>
                  <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>
                    Control: {result?.control_windows || 0} ({ (((result?.control_windows || 0) / (result?.total_windows || 1)) * 100).toFixed(0) }%)
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOTAL WINDOWS</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{result?.total_windows || 0}</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SAMPLES RECEIVED</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{result?.samples_received?.toLocaleString() || 0}</div>
                  </div>
                </div>
              </div>
            ) : (
              // Slider manual prediction: show progress bar with pointer
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  ADHD Probability Breakdown:
                </span>
                
                <div className="single-progress-bar-container">
                  <div className="single-progress-bar-fill" />
                  <div 
                    className="single-progress-bar-marker" 
                    style={{ left: `${(result?.adhd_probability || 0) * 100}%` }}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Control (0%)</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    ADHD Probability: { ((result?.adhd_probability || 0) * 100).toFixed(1) }%
                  </span>
                  <span>ADHD (100%)</span>
                </div>
              </div>
            )}

          </Card>
        </div>

        {/* Quick Navigation below results */}
        <Card className="fade-in-slide" style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, textAlign: 'left' }}>
            Quick Navigation &amp; Analysis
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            
            <button 
              className="btn btn-secondary" 
              onClick={() => { setResult(null); setError(null) }}
              style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '16px', alignItems: 'flex-start', textAlign: 'left', gap: 6, border: '1px solid rgba(0, 191, 165, 0.2)' }}
            >
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: 14 }}>Classify Another</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Input new channel values or upload another CSV recording.</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate?.('dashboard')}
              style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '16px', alignItems: 'flex-start', textAlign: 'left', gap: 6 }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Dashboard</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Overview metrics and updated session statistics.</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate?.('eda')}
              style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '16px', alignItems: 'flex-start', textAlign: 'left', gap: 6 }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>EDA &amp; Analysis</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>View exploratory plots and signal distributions.</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate?.('features')}
              style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '16px', alignItems: 'flex-start', textAlign: 'left', gap: 6 }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Feature Importances</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Explore clinical EEG biomarker rankings.</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate?.('performance')}
              style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '16px', alignItems: 'flex-start', textAlign: 'left', gap: 6 }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Model Performance</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Review accuracy, F1-score, confusion matrix.</span>
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={() => setChatOpen?.(true)}
              style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '16px', alignItems: 'flex-start', textAlign: 'left', gap: 6 }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Copilot Chat</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Discuss classification details with the AI Copilot.</span>
            </button>

          </div>
        </Card>
      </>
    )}
    </div>
  )
}
