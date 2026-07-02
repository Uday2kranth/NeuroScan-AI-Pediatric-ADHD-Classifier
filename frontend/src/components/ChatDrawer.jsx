import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Settings, Send, Loader2, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react'

const OPENROUTER_FREE_MODELS = [
  { id: "openrouter/free", label: "randome free model roulette", agent: true },
  { id: "openrouter/owl-alpha", label: "Owl Alpha", agent: true },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "NVIDIA: Nemotron 3 Ultra (free)", agent: false },
  { id: "google/gemma-4-31b-it:free", label: "Google: Gemma 4 31B (free)", agent: true },
  { id: "poolside/laguna-m.1:free", label: "Poolside: Laguna M.1 (free)", agent: true },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "NVIDIA: Nemotron 3 Super (free)", agent: true },
  { id: "openai/gpt-oss-120b:free", label: "OpenAI: gpt-oss-120b (free)", agent: true },
  { id: "poolside/laguna-xs.2:free", label: "Poolside: Laguna XS.2 (free)", agent: false },
  { id: "cohere/north-mini-code:free", label: "Cohere: North Mini Code (free)", agent: false },
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Venice: Uncensored (free)", agent: true },
  { id: "openai/gpt-oss-20b:free", label: "OpenAI: gpt-oss-20b (free)", agent: false },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "NVIDIA: Nemotron 3 Nano 30B A3B (free)", agent: false },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Google: Gemma 4 26B A4B (free)", agent: false },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "NVIDIA: Nemotron Nano 9B V2 (free)", agent: false },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Nous Research: Hermes 3 Llama 3.1 405B (free)", agent: true },
  { id: "qwen/qwen3-coder:free", label: "Qwen: Qwen3 Coder 480B A35B (free)", agent: true },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Meta: Llama 3.3 70B Instruct (free)", agent: true }
]

const NVIDIA_NIM_MODELS = [
  { id: "minimaxai/minimax-m2.7", label: "MiniMax M2.7", agent: true },
  { id: "deepseek-ai/deepseek-chat-3-2", label: "DeepSeek 3.2", agent: true },
  { id: "moonshotai/kimi-k2", label: "Kimi 2.5", agent: true },
  { id: "zhipuai/glm-5.1", label: "GLM 5.1", agent: true },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS-120B", agent: true },
  { id: "sarvamai/sarvam-m", label: "Sarvam-M Indic Translate", agent: true }
]

const MODEL_CAPABILITIES = {
  // Google Gemini
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    cap: '📧 Agent [Email, Tools] - ⚡ Fast, Recommended'
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    cap: '🧠 Reasoning & Code'
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    cap: '⚡ Standard Fast & Capable'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    cap: '🧠 High Intelligence, 2M context'
  },
  'gemini-2.0-flash-001': {
    name: 'Gemini 2.0 Flash Stable',
    cap: 'Stable production build'
  },
  'gemini-1.5-flash-002': {
    name: 'Gemini 1.5 Flash Stable',
    cap: 'Stable legacy build'
  },
  'gemini-1.5-pro-002': {
    name: 'Gemini 1.5 Pro Stable',
    cap: 'Stable high intelligence build'
  },

  // OpenAI
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    cap: '📧 Agent [Email, Tools] - ⚡ Fast, Versatile'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    cap: '📧 Agent [Email, Tools] - 🧠 High Intelligence'
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    cap: '📧 Agent [Email, Tools] - Capable'
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    cap: '📧 Agent [Email, Tools] - Legacy'
  },

  // OpenRouter Free Agent-Capable
  'openrouter/free': {
    name: 'randome free model roulette',
    cap: '📧 Agent [Email, Tools]'
  },
  'nousresearch/hermes-3-llama-3.1-405b:free': {
    name: 'Hermes 3 Llama 3.1 405B',
    cap: '📧 Agent [Email, Tools] - 🧠 Excellent Reasoning'
  },
  'nvidia/nemotron-3-super-120b-a12b:free': {
    name: 'Nemotron-3 Super 120B',
    cap: '📧 Agent [Email, Tools]'
  },
  'openai/gpt-oss-120b:free': {
    name: 'GPT-OSS 120B',
    cap: '📧 Agent [Email, Tools]'
  },
  'qwen/qwen3-coder:free': {
    name: 'Qwen 3 Coder',
    cap: '📧 Agent [Email, Tools] - 💻 Coding Specialist'
  },
  'qwen/qwen3-next-80b-a3b-instruct:free': {
    name: 'Qwen 3 Next 80B',
    cap: '📧 Agent [Email, Tools]'
  },
  'google/gemma-4-31b-it:free': {
    name: 'Gemma 4 31B It',
    cap: '📧 Agent [Email, Tools]'
  },
  'liquid/lfm-2.5-1.2b-instruct:free': {
    name: 'LFM 2.5 1.2B Instruct',
    cap: '📧 Agent [Email, Tools]'
  },
  'meta-llama/llama-3.2-3b-instruct:free': {
    name: 'Llama 3.2 3B',
    cap: '📧 Agent [Email, Tools] - Lightweight'
  },
  'meta-llama/llama-3.3-70b-instruct:free': {
    name: 'Llama 3.3 70B',
    cap: '📧 Agent [Email, Tools] - 🧠 Highly Recommended'
  },
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free': {
    name: 'Dolphin Mistral 24B',
    cap: '📧 Agent [Email, Tools]'
  },

  // OpenRouter Free Text-Only / Reasoning
  'nex-agi/nex-n2-pro:free': {
    name: 'Nex N2 Pro',
    cap: '🧠 Interpretation Only [Text Only, No Tools]'
  },
  'nvidia/nemotron-3-nano-30b-a3b:free': {
    name: 'Nemotron-3 Nano 30B',
    cap: '🧠 Interpretation Only [Text Only, No Tools]'
  },
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': {
    name: 'Nemotron-3 Nano Omni 30B',
    cap: '🧠 Advanced Reasoning [Text Only, No Tools]'
  },
  'nvidia/nemotron-3-ultra-550b-a55b:free': {
    name: 'Nemotron-3 Ultra 550B',
    cap: '🧠 Deep Interpretation [Text Only, No Tools]'
  },
  'nvidia/nemotron-3.5-content-safety:free': {
    name: 'Nemotron-3.5 Safety',
    cap: '🧠 Safety Filter [Text Only, No Tools]'
  },
  'nvidia/nemotron-nano-12b-v2-vl:free': {
    name: 'Nemotron Nano 12B VL',
    cap: '🧠 Vision & Interpretation [Text Only, No Tools]'
  },
  'nvidia/nemotron-nano-9b-v2:free': {
    name: 'Nemotron Nano 9B v2',
    cap: '🧠 Interpretation Only [Text Only, No Tools]'
  },
  'openai/gpt-oss-20b:free': {
    name: 'GPT-OSS 20B',
    cap: '🧠 Interpretation Only [Text Only, No Tools]'
  },
  'poolside/laguna-m.1:free': {
    name: 'Laguna M.1',
    cap: '🧠 Coding & Interpretation [Text Only, No Tools]'
  },
  'poolside/laguna-xs.2:free': {
    name: 'Laguna XS.2',
    cap: '🧠 Coding & Interpretation [Text Only, No Tools]'
  },
  'cohere/north-mini-code:free': {
    name: 'North Mini Code',
    cap: '🧠 Code Interpretation [Text Only, No Tools]'
  },
  'google/gemma-4-26b-a4b-it:free': {
    name: 'Gemma 4 26B It',
    cap: '🧠 Interpretation Only [Text Only, No Tools]'
  },
  'liquid/lfm-2.5-1.2b-thinking:free': {
    name: 'LFM 2.5 1.2B Thinking',
    cap: '🧠 Advanced Reasoning [Text Only, No Tools]'
  },

  // OpenRouter Free Internet Search Models
  'perplexity/sonar-reasoning:free': {
    name: 'Perplexity Sonar Reasoning',
    cap: '🌐 Internet Search Only'
  },
  'perplexity/sonar-chat:free': {
    name: 'Perplexity Sonar Chat',
    cap: '🌐 Internet Search Only'
  },
  'perplexity/llama-3.1-sonar-large-128k-online:free': {
    name: 'Perplexity Llama 3.1 Sonar 128k',
    cap: '🌐 Internet Search Only'
  },
  'minimaxai/minimax-m2.7': {
    name: 'MiniMax M2.7',
    cap: '📧 Agent [Email, Tools] - MiniMax NIM model'
  },
  'deepseek-ai/deepseek-chat-3-2': {
    name: 'DeepSeek 3.2',
    cap: '📧 Agent [Email, Tools] - DeepSeek chat NIM model'
  },
  'moonshotai/kimi-k2': {
    name: 'Kimi 2.5',
    cap: '📧 Agent [Email, Tools] - Kimi moonshot NIM model'
  },
  'zhipuai/glm-5.1': {
    name: 'GLM 5.1',
    cap: '📧 Agent [Email, Tools] - GLM NIM model'
  },
  'openai/gpt-oss-120b': {
    name: 'GPT-OSS-120B',
    cap: '📧 Agent [Email, Tools] - GPT OSS NIM model'
  },
  'sarvamai/sarvam-m': {
    name: 'Sarvam-M Indic Translate',
    cap: '📧 Agent [Email, Tools] - Indic Translation model'
  }
}


export default function ChatDrawer({ isOpen: controlledIsOpen, setIsOpen: controlledSetIsOpen }) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = controlledSetIsOpen !== undefined ? controlledSetIsOpen : setInternalIsOpen
  const [showSettings, setShowSettings] = useState(false)
  
  // Settings state (hydrated from localStorage)
  const [provider, setProvider] = useState(() => localStorage.getItem('ns_chat_provider') || 'openrouter')
  const [model, setModel] = useState(() => localStorage.getItem('ns_chat_model') || 'openrouter/free')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ns_chat_key') || '')
  
  const [showKey, setShowKey] = useState(false)
  
  // Dynamic Success animation trigger
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Chat state
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('ns_chat_messages')
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: 'Hello! I am your NeuroScan AI Copilot. I have access to the dataset parameters, current model classification performance, and feature importances. Ask me anything about the EEG ADHD classification workspace.' }
    ]
  })
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Session ID
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('ns_chat_session_id')
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('ns_chat_session_id', id)
    }
    return id
  })

  const messagesEndRef = useRef(null)

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('ns_chat_provider', provider)
  }, [provider])

  // Safeguard: Automatically reset model if it is not valid for the active provider
  useEffect(() => {
    const provConfig = PROVIDERS.find(p => p.id === provider)
    if (provConfig) {
      const modelExists = provConfig.models.some(m => {
        const id = typeof m === 'object' && m !== null ? m.id : m
        return id === model
      })
      if (!modelExists) {
        console.warn(`Sanitizing stale model state ${model} for provider ${provider} -> Resetting to default: ${provConfig.defaultModel}`)
        setModel(provConfig.defaultModel)
      }
    }
  }, [provider, model])

  useEffect(() => {
    localStorage.setItem('ns_chat_model', model)
  }, [model])

  useEffect(() => {
    localStorage.setItem('ns_chat_key', apiKey)
  }, [apiKey])



  useEffect(() => {
    localStorage.setItem('ns_chat_messages', JSON.stringify(messages))
    scrollToBottom()
  }, [messages])

  // Fetch initial custom greeting based on latest prediction context
  useEffect(() => {
    if (messages.length === 1 && messages[0].content.startsWith('Hello! I am your NeuroScan AI Copilot.')) {
      fetch('/api/chat/greeting')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data && data.greeting) {
            setMessages([{ role: 'assistant', content: data.greeting }])
          }
        })
        .catch(err => console.error('Greeting fetch error:', err))
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle provider changes to reset correct default models
  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    const provConfig = PROVIDERS.find(p => p.id === newProvider)
    if (provConfig) {
      setModel(provConfig.defaultModel)
    }
  }

  const handleSendMessage = async (text) => {
    if (!text.trim()) return
    setError(null)
    
    // Check if key is required
    if (!apiKey.trim()) {
      setError('Please configure your API key in the Chat Settings.')
      setShowSettings(true)
      return
    }

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setLoading(true)
    setShowSuccess(false)

    try {
      let simulatorState = null
      try {
        const stored = localStorage.getItem('neuroscan_simulator_state')
        if (stored) {
          simulatorState = JSON.parse(stored)
        }
      } catch (e) {
        console.error('Failed to parse simulator state', e)
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          chat_provider: provider,
          chat_model: model,
          chat_api_key: apiKey,
          simulator_state: simulatorState,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to get response')
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      
      // Trigger success checkmark animation
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = async () => {
    try {
      await fetch(`/api/chat/${sessionId}`, { method: 'DELETE' })
      setMessages([
        { role: 'assistant', content: 'Chat history cleared. I am ready to help you analyze the workspace again!' }
      ])
      setError(null)
    } catch (err) {
      console.error('Failed to clear session history:', err)
      // Fallback local clear
      setMessages([
        { role: 'assistant', content: 'Failed to notify server, but cleared local session cache. I am ready!' }
      ])
    }
  }

  const quickPrompts = [
    { label: 'Metrics', text: 'Explain the active model performance metrics.' },
    { label: 'Features', text: 'Which EEG features are most important for classifying ADHD?' },
    { label: 'Bands', text: 'How does the band power ratio (like theta/beta) relate to ADHD?' },
  ]

  const PROVIDERS = [
    { id: 'openrouter', label: 'OpenRouter (Free)', defaultModel: 'openrouter/free', models: OPENROUTER_FREE_MODELS },
    { id: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-2.0-flash', models: [
      'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro',
      'gemini-2.0-flash-001', 'gemini-1.5-flash-002', 'gemini-1.5-pro-002'
    ]},
    { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    { id: 'nvidia', label: 'Nvidia NIM', defaultModel: 'minimaxai/minimax-m2.7', models: NVIDIA_NIM_MODELS }
  ]

  const activeProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]

  return (
    <>
      {/* Floating Chat Trigger Button */}
      <button 
        className="floating-chat-btn" 
        onClick={() => setIsOpen(true)}
        title="Open Copilot Chat"
      >
        <Sparkles size={24} />
      </button>

      {/* Backdrop Scrim */}
      <div 
        className={`chat-scrim ${isOpen ? 'chat-scrim--open' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer Body */}
      <aside className={`chat-drawer ${isOpen ? 'chat-drawer--open' : ''}`}>
        
        {/* Glassmorphic Glow particles/effects */}
        <div className="chat-drawer-bg">
          <div className="chat-glow-bubble chat-glow-bubble--1"></div>
          <div className="chat-glow-bubble chat-glow-bubble--2"></div>
          <div className="chat-glow-bubble chat-glow-bubble--3"></div>
          <div className="chat-particles">
            <div className="chat-particle"></div>
            <div className="chat-particle"></div>
            <div className="chat-particle"></div>
            <div className="chat-particle"></div>
          </div>
        </div>

        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-title">
            <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} />
            <span>NeuroScan AI Copilot</span>
          </div>
          <div className="chat-header-actions">
            {showSuccess && (
              <div className="success-lottie-indicator" style={{ display: 'flex', alignItems: 'center' }}>
                <dotlottie-player
                  src="https://lottie.host/5a09cc14-b15f-47dc-9bfd-872f2d93d3b7/V7YqG5Dk2F.json"
                  background="transparent"
                  speed="1"
                  style={{ width: '32px', height: '32px' }}
                  autoplay
                />
              </div>
            )}
            <button 
              className="chat-header-btn" 
              onClick={() => setShowSettings(!showSettings)}
              title={showSettings ? "Show Chat" : "LLM Settings"}
            >
              <Settings size={18} style={{ color: showSettings ? 'var(--accent-primary)' : 'inherit' }} />
            </button>
            <button 
              className="chat-header-btn" 
              onClick={() => setIsOpen(false)}
              title="Close Drawer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Conditional settings panel vs message log */}
        {showSettings ? (
          <div className="chat-settings-panel">
            <h4 className="chat-settings-title">Model Settings</h4>
            
            <div className="chat-settings-field">
              <label>AI Provider</label>
              <select 
                className="input" 
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="chat-settings-field">
              <label>Model</label>
              <select 
                className="input" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {activeProvider.models.map(m => {
                  const isObj = typeof m === 'object' && m !== null;
                  const modelId = isObj ? m.id : m;
                  const isAgent = isObj ? !!m.agent : (
                    MODEL_CAPABILITIES[m]?.cap?.toLowerCase().includes('agent') || 
                    m.startsWith('gemini') || 
                    m.startsWith('gpt')
                  );
                  const prefix = isAgent ? '🤖 [Agent✓] ' : '📝 [Text Only] ';
                  const modelLabel = prefix + (isObj ? m.label : (MODEL_CAPABILITIES[m]?.name || (m.includes('/') ? m.split('/')[1] : m)));
                  const modelCap = isObj ? (m.agent ? '📧 Agent [Email, Tools]' : 'General Model') : (MODEL_CAPABILITIES[m]?.cap || 'General Model');
                  return (
                    <option key={modelId} value={modelId}>
                      {modelLabel} ({modelCap})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="chat-settings-field">
              <label>API Key</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showKey ? "text" : "password"} 
                  className="input" 
                  placeholder="Paste your API key here..." 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span className="chat-settings-desc">
                Keys are only sent with requests and are not stored permanently on our server.
              </span>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleClearHistory}>
                Clear Chat History
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowSettings(false)}>
                Back to Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages list */}
            <div className="chat-messages-container">
              {/* Intelligent greeting lottie animation */}
              {messages.length === 1 && (
                <div className="lottie-animation-wrapper">
                  <dotlottie-player
                    src="https://lottie.host/e2381283-bc8d-4a1b-bd57-3f3248679d63/vQ5f8XF7k1.json"
                    background="transparent"
                    speed="1"
                    className="bot-greeting-lottie"
                    loop
                    autoplay
                  />
                </div>
              )}
              
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`chat-message-row ${msg.role === 'user' ? 'chat-message-row--user' : 'chat-message-row--assistant'}`}
                >
                  <div 
                    className={`chat-message-bubble ${msg.role === 'user' ? 'chat-message-bubble--user' : 'chat-message-bubble--assistant'}`}
                  >
                    {/* Basic Markdown-like parser and table handler */}
                    {parseMarkdown(msg.content)}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="chat-message-row chat-message-row--assistant">
                  <div className="chat-message-bubble chat-message-bubble--assistant" style={{ padding: '4px 10px' }}>
                    <div className="lottie-animation-wrapper" style={{ margin: 0 }}>
                      <dotlottie-player
                        src="https://lottie.host/17e2c9ef-b0cf-46d6-963d-495204217154/f53F8n96y2.json"
                        background="transparent"
                        speed="1"
                        className="bot-thinking-lottie"
                        loop
                        autoplay
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-rose)', fontSize: '12px', padding: '8px', background: 'rgba(255, 23, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 23, 68, 0.2)' }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />

              {/* Quick Prompt Options */}
              {messages.length === 1 && !loading && (
                <div className="chat-quick-actions">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    Quick Prompts
                  </span>
                  {quickPrompts.map((qp, i) => (
                    <button 
                      key={i} 
                      className="chat-quick-action-btn"
                      onClick={() => handleSendMessage(qp.text)}
                    >
                      <strong>{qp.label}:</strong> {qp.text}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="chat-input-area">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }} 
                className="chat-input-wrapper"
              >
                <input
                  type="text"
                  className="input"
                  placeholder={loading ? "AI is typing..." : "Ask Copilot about ADHD data..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading || !inputText.trim()}
                  style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {loading ? <Loader2 size={16} className="spinner-icon" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// Advanced custom Markdown parser that supports paragraphs, lists, bold, inline code, and Markdown tables
// Advanced custom Markdown line parser
function parseLine(para, i) {
  if (!para || typeof para !== 'string' || !para.trim()) return <div key={i} style={{ height: '12px' }} />
  
  // Match unordered lists
  if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
    return (
      <ul key={i} style={{ margin: '8px 0 8px 16px', listStyleType: 'disc' }}>
        <li style={{ marginBottom: '4px', lineHeight: '1.5' }}>{parseInlineFormatting(para.trim().substring(2))}</li>
      </ul>
    )
  }
  
  // Match ordered lists
  const numMatch = para.trim().match(/^(\d+)\.\s(.*)/)
  if (numMatch) {
    return (
      <ol key={i} style={{ margin: '8px 0 8px 16px', listStyleType: 'decimal' }} start={numMatch[1]}>
        <li style={{ marginBottom: '4px', lineHeight: '1.5' }}>{parseInlineFormatting(numMatch[2])}</li>
      </ol>
    )
  }
  
  // Header level 1
  if (para.trim().startsWith('# ')) {
    return <h1 key={i} style={{ fontSize: '18px', fontWeight: 700, margin: '16px 0 8px 0', color: 'var(--text-primary)' }}>{parseInlineFormatting(para.trim().substring(2))}</h1>
  }

  // Header level 2
  if (para.trim().startsWith('## ')) {
    return <h2 key={i} style={{ fontSize: '16px', fontWeight: 700, margin: '14px 0 8px 0', color: 'var(--text-primary)' }}>{parseInlineFormatting(para.trim().substring(3))}</h2>
  }

  // Header level 3
  if (para.trim().startsWith('### ')) {
    return <h3 key={i} style={{ fontSize: '14px', fontWeight: 700, margin: '12px 0 6px 0', color: 'var(--text-primary)' }}>{parseInlineFormatting(para.trim().substring(4))}</h3>
  }

  // Header level 4
  if (para.trim().startsWith('#### ')) {
    return <h4 key={i} style={{ fontSize: '13px', fontWeight: 600, margin: '10px 0 6px 0', color: 'var(--text-secondary)' }}>{parseInlineFormatting(para.trim().substring(5))}</h4>
  }
  
  return <p key={i} style={{ margin: '10px 0', lineHeight: '1.5' }}>{parseInlineFormatting(para)}</p>
}

function parseMarkdown(text) {
  if (!text || typeof text !== 'string') return null;
  // Check if content has markdown tables
  if (text.includes('|') && text.split('\n').some(line => line.trim().startsWith('|') && line.includes('---'))) {
    return parseMarkdownWithTables(text)
  }

  return text.split('\n').map((para, i) => {
    return parseLine(para, i)
  })
}

// Parses inline bold and backtick code
function parseInlineFormatting(text) {
  const parts = []
  let index = 0
  
  const regex = /(\*\*.*?\*\*|`.*?`)/g
  const matches = [...text.matchAll(regex)]
  
  if (matches.length === 0) return text
  
  matches.forEach((match) => {
    const matchIndex = match.index
    const matchText = match[0]
    
    if (matchIndex > index) {
      parts.push(text.substring(index, matchIndex))
    }
    
    if (matchText.startsWith('**') && matchText.endsWith('**')) {
      parts.push(<strong key={matchIndex} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{matchText.slice(2, -2)}</strong>)
    } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
      parts.push(<code key={matchIndex}>{matchText.slice(1, -1)}</code>)
    }
    
    index = matchIndex + matchText.length
  })
  
  if (index < text.length) {
    parts.push(text.substring(index))
  }
  
  return parts
}

// Helper to render Markdown tables cleanly
// Helper to render Markdown tables cleanly
function parseMarkdownWithTables(text) {
  const elements = []
  const lines = text.split('\n')
  let currentTable = null
  let currentRows = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('|')) {
      // It's a table line
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1)
      
      if (line.includes('---')) {
        // Separator line, ignore
        continue
      }

      if (!currentTable) {
        // This is the header row
        currentTable = { headers: cells }
      } else {
        currentRows.push(cells)
      }
    } else {
      // Normal line
      if (currentTable) {
        // Output accumulated table first
        const tblHeaders = [...currentTable.headers]
        const tblRows = [...currentRows]
        elements.push(
          <table key={`table-${i}`}>
            <thead>
              <tr>
                {tblHeaders.map((h, idx) => <th key={idx}>{parseInlineFormatting(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {tblRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => <td key={cIdx}>{parseInlineFormatting(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )
        currentTable = null
        currentRows = []
      }
      elements.push(parseLine(line, i))
    }
  }

  // Handle trailing table if any
  if (currentTable) {
    const tblHeaders = [...currentTable.headers]
    const tblRows = [...currentRows]
    elements.push(
      <table key="table-trail">
        <thead>
          <tr>
            {tblHeaders.map((h, idx) => <th key={idx}>{parseInlineFormatting(h)}</th>)}
          </tr>
        </thead>
        <tbody>
          {tblRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => <td key={cIdx}>{parseInlineFormatting(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return elements;
}
