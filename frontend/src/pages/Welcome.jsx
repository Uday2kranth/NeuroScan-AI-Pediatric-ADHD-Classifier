import { useState } from 'react'
import { 
  SlidersHorizontal, Upload, BarChart3, Activity, Sparkles, Stethoscope, Loader2, PlayCircle
} from 'lucide-react'
import Card from '../components/Card'

export default function Welcome({ onNavigate, setPredictTab, setChatOpen, triggerStatusRefresh }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLoadDemo = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/load-sample', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error('Failed to load sample dataset and train models.')
      }
      const data = await response.json()
      
      // Refresh backend status in App.jsx
      if (triggerStatusRefresh) {
        await triggerStatusRefresh()
      }
      
      // Redirect directly to Inference Console (Predict tab -> Sliders view)
      setPredictTab('sliders')
      onNavigate('predict')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      title: 'Inference Console',
      description: 'Interact with 19 real-time EEG channel sliders to simulate signal values and classify patient state instantly.',
      icon: SlidersHorizontal,
      color: 'var(--accent-primary)',
      actionText: 'Open Console',
      action: () => {
        setPredictTab('sliders')
        onNavigate('predict')
      }
    },
    {
      title: 'EEG CSV Predictor',
      description: 'Upload raw pediatric EEG recordings in CSV format. Perform artifact rejection, windowing, and majority-vote predictions.',
      icon: Upload,
      color: 'var(--accent-secondary)',
      actionText: 'Predict from CSV',
      action: () => {
        setPredictTab('upload')
        onNavigate('predict')
      }
    },
    {
      title: 'Exploratory Data Analysis',
      description: 'Examine raw EEG waveforms, power spectral density (PSD) comparisons, and clinical theta/beta ratios.',
      icon: BarChart3,
      color: 'var(--accent-teal)',
      actionText: 'View EDA',
      action: () => onNavigate('eda')
    },
    {
      title: 'Model Performance Metrics',
      description: 'Analyze Stratified Group K-Fold cross-validation metrics, AUC-ROC comparisons, and held-out test evaluations.',
      icon: Activity,
      color: 'var(--accent-amber)',
      actionText: 'View Metrics',
      action: () => onNavigate('performance')
    },
    {
      title: 'XAI Feature Explorer',
      description: 'Explore tree-based and permutation feature importances to identify key neurotypical EEG biomarkers.',
      icon: Sparkles,
      color: 'var(--accent-rose)',
      actionText: 'Explore Biomarkers',
      action: () => onNavigate('features')
    },
    {
      title: 'AI Clinician Copilot',
      description: 'Ask questions, review metrics, or translate complex EEG patterns into parent-friendly insights with the Copilot.',
      icon: Stethoscope,
      color: 'var(--accent-sky)',
      actionText: 'Launch Copilot',
      action: () => setChatOpen(true)
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Welcome Banner */}
      <div className="card welcome-hero-card" style={{ 
        background: 'linear-gradient(135deg, rgba(13, 21, 32, 0.9) 0%, rgba(21, 34, 50, 0.75) 100%)',
        border: 'var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Stethoscope size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', background: 'var(--gradient-header)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                NeuroScan AI
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pediatric ADHD EEG Classification Workspace
              </p>
            </div>
          </div>
          
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>
            Welcome to the Clinical Classifier & Exploration Portal
          </h2>
          
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: 750 }}>
            This application implements an end-to-end machine learning pipeline for classifying ADHD in pediatric subjects using 19-channel visual attention task EEG recordings. Use this workspace to run model predictions, view Exploratory Data Analysis, audit model statistics, and interact with our AI Clinician Copilot.
          </p>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleLoadDemo} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 24px', fontSize: 15 }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  Auto-Training Pipeline...
                </>
              ) : (
                <>
                  <PlayCircle size={18} />
                  Load Demo Dataset & Start
                </>
              )}
            </button>
            
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Loads original dataset, auto-trains model pipeline, and redirects to Inference Sliders.
            </span>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)', marginTop: 12, background: 'rgba(255, 23, 68, 0.1)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 23, 68, 0.2)' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Error: {error}</span>
            </div>
          )}
        </div>
        
        {/* Glow decoration */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(0, 191, 165, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />
      </div>

      {/* Feature Portal Navigation */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
          Explore Workspace Directories
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {features.map((f, i) => {
            const isPredict = i < 2;
            return (
              <Card 
                key={i} 
                className="welcome-feature-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  justifyContent: 'space-between', 
                  padding: 24,
                  border: isPredict ? '1px solid rgba(0, 191, 165, 0.25)' : undefined,
                  boxShadow: isPredict ? '0 4px 20px rgba(0, 191, 165, 0.08)' : undefined,
                  position: 'relative'
                }}
              >
                {isPredict && (
                  <span style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'rgba(0, 191, 165, 0.1)',
                    color: 'var(--accent-primary)',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Primary Action
                  </span>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 'var(--radius-md)', 
                    background: `rgba(${f.color === 'var(--accent-primary)' ? '0,191,165' : f.color === 'var(--accent-secondary)' ? '0,176,255' : f.color === 'var(--accent-teal)' ? '0,230,118' : f.color === 'var(--accent-amber)' ? '255,234,0' : f.color === 'var(--accent-rose)' ? '255,23,68' : '0,229,255'}, 0.1)`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: f.color
                  }}>
                    <f.icon size={20} />
                  </div>
                  
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {f.title}
                  </h4>
                  
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {f.description}
                  </p>
                </div>
                
                <button 
                  className={`btn ${isPredict ? 'btn-primary' : 'btn-ghost'} btn-sm`} 
                  onClick={f.action}
                  style={{ 
                    marginTop: 18, 
                    alignSelf: 'flex-start', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {f.actionText} &rarr;
                </button>
              </Card>
            )
          })}
        </div>
      </div>
      
    </div>
  )
}
