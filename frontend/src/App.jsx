import { useState, useEffect } from 'react'
import { Menu, Stethoscope } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChatDrawer from './components/ChatDrawer'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import EDA from './pages/EDA'
import ModelPerformance from './pages/ModelPerformance'
import Predict from './pages/Predict'
import FeatureImportance from './pages/FeatureImportance'

const PAGES = {
  welcome: Welcome,
  dashboard: Dashboard,
  eda: EDA,
  performance: ModelPerformance,
  predict: Predict,
  features: FeatureImportance,
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('welcome')
  const [predictTab, setPredictTab] = useState('sliders')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [modelTrained, setModelTrained] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status')
      if (res.ok) {
        const data = await res.json()
        setModelTrained(data.model_trained)
      }
    } catch (e) {
      console.error('Failed to fetch status:', e)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const PageComponent = PAGES[currentPage]

  const pageProps = {
    onNavigate: setCurrentPage,
    setPredictTab: setPredictTab,
    setChatOpen: setChatOpen,
    modelTrained: modelTrained,
    triggerStatusRefresh: fetchStatus,
  }

  if (currentPage === 'predict') {
    pageProps.tab = predictTab
    pageProps.setTab = setPredictTab
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Bar */}
      <header className="mobile-top-bar">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="mobile-title">
          <Stethoscope size={18} className="text-indigo" />
          NeuroScan AI
        </div>
        <div style={{ width: 24 }} /> {/* Spacer to center title */}
      </header>

      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <main className={`main-content ${sidebarCollapsed ? 'main-content--collapsed' : ''}`}>
        <div key={currentPage} className="fade-in-slide">
          <PageComponent {...pageProps} />
        </div>
      </main>

      {/* Copilot Chat Drawer */}
      <ChatDrawer isOpen={chatOpen} setIsOpen={setChatOpen} />
    </div>
  )
}
