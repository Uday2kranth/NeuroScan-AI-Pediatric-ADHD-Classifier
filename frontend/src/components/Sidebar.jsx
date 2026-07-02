import {
  LayoutDashboard, BarChart3, Activity, Upload, Sparkles, Stethoscope, Download, X, HelpCircle, ChevronLeft, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'welcome', label: 'Welcome Portal', icon: HelpCircle, desc: 'App guide & portal' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Dataset stats & active session' },
  { id: 'eda', label: 'EDA', icon: BarChart3, desc: 'EEG signal plots & distribution' },
  { id: 'performance', label: 'Model Metrics', icon: Activity, desc: 'Classifier training stats' },
  { id: 'predict', label: 'Predict', icon: Upload, desc: 'Sliders & CSV upload console' },
  { id: 'features', label: 'Features', icon: Sparkles, desc: 'XAI biomarker importances' },
]

export default function Sidebar({ currentPage, onNavigate, sidebarOpen, onCloseSidebar, collapsed, onToggleCollapse }) {
  const handleDownloadModel = async () => {
    window.open('/api/download-model', '_blank')
    if (onCloseSidebar) onCloseSidebar()
  }

  const handleNavClick = (id) => {
    onNavigate(id)
    if (onCloseSidebar) onCloseSidebar()
  }

  return (
    <>
      {/* Mobile scrim overlay */}
      <div 
        className={`sidebar-scrim ${sidebarOpen ? 'sidebar-scrim--open' : ''}`} 
        onClick={onCloseSidebar}
      />

      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''} ${collapsed ? 'sidebar--collapsed' : ''}`}>
        {/* Logo Section */}
        <div className="logo-section" style={{ padding: collapsed ? '24px 12px' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="logo-icon" style={{ margin: collapsed ? '0 auto' : undefined }}>
              <Stethoscope size={20} color="white" strokeWidth={2.2} />
            </div>
            {!collapsed && onCloseSidebar && (
              <button 
                className="menu-toggle" 
                onClick={onCloseSidebar}
                style={{ display: 'flex', padding: 8, margin: -8 }}
              >
                <X size={20} />
              </button>
            )}
          </div>
          {!collapsed && (
            <>
              <div className="logo-title">NeuroScan AI</div>
              <div className="logo-subtitle">Pediatric ADHD Classifier</div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="nav-section">
          {!collapsed && <div className="nav-label">Analysis</div>}
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? `${item.label} - ${item.desc}` : ''}
              style={{ 
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 8px' : '10px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? '4px' : '2px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <item.icon size={18} className="nav-icon-svg" />
                {!collapsed && <span className="nav-link-text" style={{ fontWeight: 600 }}>{item.label}</span>}
              </div>
              {!collapsed && (
                <span className="nav-link-desc" style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)', 
                  paddingLeft: '30px',
                  fontWeight: 400,
                  whiteSpace: 'normal',
                  lineHeight: '1.3'
                }}>
                  {item.desc}
                </span>
              )}
            </button>
          ))}

          {!collapsed && <div className="nav-label" style={{ marginTop: 20 }}>Tools</div>}
          <button 
            className="nav-link" 
            onClick={handleDownloadModel}
            title={collapsed ? 'Export Model' : ''}
            style={{ 
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 8px' : '10px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? '4px' : '2px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Download size={18} className="nav-icon-svg" />
              {!collapsed && <span className="nav-link-text">Export Model</span>}
            </div>
            {!collapsed && (
              <span className="nav-link-desc" style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)', 
                paddingLeft: '30px',
                fontWeight: 400,
                whiteSpace: 'normal',
                lineHeight: '1.3'
              }}>
                Zip models and outputs
              </span>
            )}
          </button>
        </nav>

        {/* Collapse Toggle Button */}
        <div style={{ padding: '12px', display: 'flex', justifyContent: 'center', borderTop: 'var(--border-subtle)' }}>
          <button 
            onClick={onToggleCollapse} 
            className="btn btn-ghost" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px' }}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : (
              <>
                <ChevronLeft size={18} />
                <span style={{ fontSize: 13 }}>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="sidebar-footer">
            <p>
              121 subjects<br />
              19 EEG channels · 128 Hz
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
