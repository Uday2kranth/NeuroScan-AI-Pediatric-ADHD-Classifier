import { useState, useEffect } from 'react'
import {
  BarChart3, AlertCircle, ZoomIn, ZoomOut, X, Maximize2, RefreshCw
} from 'lucide-react'
import Card from '../components/Card'

const CLINICIAN_EXPLANATIONS = {
  '01_class_distribution.png': {
    title: 'Class Balance (ADHD vs Control Subjects)',
    interpretation: 'This bar chart displays the distribution of target classes in our dataset (ADHD vs. healthy Controls). Stratified representation ensures the classification models are trained on balanced classes without learning prior probability biases.',
    significance: 'Clinically, visual attention visual stimulus EEG recording duration depends on the response speed of each subject. Thus, the sample size matches standard research distributions for binary classification baseline stratified datasets.'
  },
  '03_raw_eeg.png': {
    title: 'Raw EEG Multichannel Waveforms',
    interpretation: 'Displays raw electrical potential waveforms (in microvolts, μV) over a short temporal window across standard 10-20 system scalp channels. Vertical amplitude changes correspond to cortical neural synchrony.',
    significance: 'Allows immediate artifact visual screening (e.g. eye-blinks or muscle movements) before filtering and band-power decomposition pipelines are run.'
  },
  '05_correlation_heatmap.png': {
    title: 'EEG Channel Correlation Matrix Heatmap',
    interpretation: 'Shows the Pearson correlation coefficient between all 19 EEG channels. High positive correlation (bright/hot colors) indicate strong signal phase similarity and functional coupling between adjacent brain lobes.',
    significance: 'In ADHD diagnostics, frontal-to-occipital and left-to-right hemisphere connectivity patterns are crucial. For instance, abnormal inter-hemispheric coherence in the theta band is often associated with cognitive visual attention load deficits.'
  },
  '06_psd_comparison.png': {
    title: 'Power Spectral Density (PSD) Comparison',
    interpretation: 'Compares the power distribution (μV²/Hz) across frequency bands (Delta, Theta, Alpha, Beta, Gamma) between ADHD and Control cohorts. Computed via Welch Periodograms.',
    significance: 'ADHD subjects often demonstrate elevated absolute spectral power in slow wave frequencies (especially Theta band, 4-8 Hz) in the frontal lobes during visual tasks, indicating cortical hypoarousal.'
  },
  '07_theta_beta_ratio.png': {
    title: 'Frontal Theta/Beta Ratio (TBR) Distribution',
    interpretation: 'Plots the density distribution of the ratio of frontal Theta power to frontal Beta power. The ratio is derived per window and plotted per cohort.',
    significance: 'Elevated frontal Theta/Beta ratio (TBR) is an FDA-cleared EEG biomarker associated with pediatric ADHD. It reflects the imbalance between slow executive control waves (theta) and fast processing waves (beta).'
  },
  '09_boxplot_channels.png': {
    title: 'EEG Signal Amplitude Ranges Boxplots',
    interpretation: 'Presents box-and-whisker plots of signal amplitude distributions across key continuous channels (Fp1, Cz, Fz, Pz) grouped by diagnosis. The central line represents median voltage values, boxes show the IQR range, and whiskers display signal variation boundaries.',
    significance: 'Indicates the statistical spread and maximum/minimum baseline variations. ADHD subjects frequently display higher overall voltage fluctuations during attention tasks due to heightened neuro-electrical variability.'
  }
}

export default function EDA() {
  const [figures, setFigures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal lightbox state
  const [activeImage, setActiveImage] = useState(null)
  const [scale, setScale] = useState(1.0)
  
  // Card inline zoom scale state
  const [inlineZooms, setInlineZooms] = useState({})

  useEffect(() => {
    fetch('/api/figures')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && data.figures) {
          const allowedEdaFilenames = [
            '01_class_distribution.png',
            '03_raw_eeg.png',
            '05_correlation_heatmap.png',
            '06_psd_comparison.png',
            '07_theta_beta_ratio.png',
            '09_boxplot_channels.png'
          ]
          const edaFigures = data.figures.filter(f => 
            allowedEdaFilenames.includes(f.filename)
          )
          setFigures(edaFigures)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load figures. Ensure the backend is running and EDA has been generated.')
        setLoading(false)
      })
  }, [])

  const handleOpenLightbox = (fig) => {
    setActiveImage(fig)
    setScale(1.0) // Reset scale on open
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto' }}>
        <div className="page-header">
          <h1 className="page-title">Exploratory Data Analysis</h1>
          <p className="page-subtitle">Signal visualizations and distributions</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    )
  }

  if (error && figures.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto' }}>
        <div className="page-header">
          <h1 className="page-title">Exploratory Data Analysis</h1>
          <p className="page-subtitle">Visual exploration of the EEG dataset</p>
        </div>
        <Card style={{ borderColor: 'var(--accent-rose)', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={48} style={{ color: 'var(--accent-rose)' }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>EDA Visualizations Unavailable</h3>
            <p style={{ maxWidth: 500, fontSize: 14, lineHeight: '1.6' }}>
              The Exploratory Data Analysis figures could not be loaded. Please ensure that the backend API is running and the data analysis has been generated.
            </p>
            <div style={{ marginTop: 8, padding: '12px 20px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)', fontFamily: 'JetBrains Mono', fontSize: 12, textAlign: 'left', color: 'var(--text-primary)' }}>
              python main.py
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div className="page-header">
        <h1 className="page-title">Exploratory Data Analysis</h1>
        <p className="page-subtitle">
          Visual exploration of the EEG dataset — class distributions, spectral analysis, amplitude ranges, and correlations
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

      {figures.length === 0 && !error ? (
        <div className="figures-empty-state">
          <BarChart3 size={48} />
          <h3>No EDA Figures Available</h3>
          <p style={{ marginTop: 8 }}>
            Run the main pipeline to generate visualizations:<br />
            <code style={{ marginTop: 12, display: 'inline-block' }}>python main.py</code>
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48, alignItems: 'center', width: '100%' }}>
          {figures.map((fig, idx) => {
            const currentZoom = inlineZooms[idx] || 1.0
            const explanation = CLINICIAN_EXPLANATIONS[fig.filename] || {
              title: fig.title,
              interpretation: 'Standard exploratory data visualization representing EEG channel values or calculated indicators.',
              significance: 'Useful for understanding clinical outcomes and diagnostic classification patterns.'
            }
            return (
              <div 
                key={fig.filename} 
                className="fade-in-slide"
                style={{ 
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
                <Card noPadding={true} style={{ overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: 'var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{explanation.title}</span>
                    <div className="inline-zoom-toolbar" style={{ margin: 0 }}>
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
                        title="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 4px' }}>{Math.round(currentZoom * 100)}%</span>
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
                        title="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInlineZooms(prev => ({ ...prev, [idx]: 1.0 }))
                        }}
                        style={{ display: 'flex', padding: 4, borderRadius: '50%', color: 'var(--text-secondary)' }}
                        title="Reset Zoom"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>

                  <div 
                    className="inline-zoom-container"
                    style={{ 
                      height: 400,
                      cursor: 'zoom-in',
                      background: '#0a0d16',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                    onClick={() => handleOpenLightbox(fig)}
                  >
                    <img
                      src={fig.url}
                      alt={fig.title}
                      loading="lazy"
                      style={{ 
                        transform: `scale(${currentZoom})`,
                        maxWidth: '96%',
                        maxHeight: '96%',
                        objectFit: 'contain',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                    <div className="figure-zoom-overlay">
                      <div className="figure-zoom-icon-btn">
                        <Maximize2 size={16} />
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Clinician Explanation Block (Glassmorphic) */}
                <div 
                  className="glass-card"
                  style={{
                    background: 'var(--bg-glass)',
                    border: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px 24px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  <div>
                    <h5 style={{ fontSize: 11, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Interpretation Guide
                    </h5>
                    <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: '1.6', marginTop: 4 }}>
                      {explanation.interpretation}
                    </p>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <h5 style={{ fontSize: 11, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Clinical Significance
                    </h5>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: 4 }}>
                      {explanation.significance}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
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
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>
            <div className="lightbox-toolbar">
              <button className="btn btn-ghost" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}><ZoomOut size={16} /></button>
              <span>{Math.round(scale * 100)}%</span>
              <button className="btn btn-ghost" onClick={() => setScale(s => Math.min(4.0, s + 0.25))}><ZoomIn size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
