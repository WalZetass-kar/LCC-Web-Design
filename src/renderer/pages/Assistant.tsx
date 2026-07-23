import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Bot, Send, Trash2, Sparkles, ShoppingCart, TrendingUp, HelpCircle,
  Copy, Check, Wifi, WifiOff, Calculator, Settings, Zap, ZapOff,
  RefreshCw, ChevronLeft, ChevronRight, Plus, Search, Pin, MessageSquare,
  ThumbsUp, ThumbsDown, Bookmark, ArrowDown, Paperclip, Mic, Cpu,
  ShieldCheck, PieChart, Layers, Clock, X, Terminal, CheckCircle2, RotateCcw, AlertTriangle
} from 'lucide-react'
import Button from '../components/Button'
import Badge from '../components/Badge'
import { Skeleton } from '../components/Skeleton'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { useNavigate } from 'react-router-dom'
import { buildLocalAssistantResponse } from '../../shared/dashboardAssistant'
import type { DashboardSummary } from '../../shared/types'

interface AiConfig {
  aiEnabled: boolean
  aiProvider: string
  aiModel: string
  aiApiKey: string
  aiBaseUrl: string
}

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: Date
  provider?: string
  online?: boolean
  bookmarked?: boolean
  liked?: boolean | null
}

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  isPinned?: boolean
  messages: Message[]
}

const STORAGE_SESSIONS_KEY = 'zetass_ai_sessions_v2'
const STORAGE_ACTIVE_KEY = 'zetass_ai_active_id_v2'
const MAX_STORED_MESSAGES = 60

const PROVIDER_LABELS: Record<string, string> = {
  local: 'Lokal (Offline)',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  bluesminds: 'BluesMinds',
  custom: 'Custom',
}

const QUICK_ACTIONS = [
  {
    id: 'sales-analysis',
    title: 'Analisis Penjualan',
    desc: 'Tinjau omzet, grafik harian, & tren transaksi',
    icon: TrendingUp,
    badge: 'Trending',
    prompt: 'Berikan analisis mendalam tentang performa penjualan dan omzet toko saat ini.',
  },
  {
    id: 'restock-predict',
    title: 'Prediksi Restock',
    desc: 'Cek produk dengan stok kritis & rekomendasi reorder',
    icon: ShoppingCart,
    badge: 'Stok Kritis',
    prompt: 'Produk mana saja yang stoknya hampir habis dan perlu segera di-restock?',
  },
  {
    id: 'hpp-calc',
    title: 'Hitung HPP Produk',
    desc: 'Kalkulasi HPP & margin keuntungan produk utama',
    icon: Calculator,
    badge: 'Keuangan',
    prompt: 'Bagaimana cara menghitung dan mengoptimalkan HPP produk di toko saya?',
  },
  {
    id: 'security-audit',
    title: 'Audit Keamanan',
    desc: 'Evaluasi log kesalahan sistem, akses user, & risiko',
    icon: ShieldCheck,
    badge: 'Keamanan',
    prompt: 'Lakukan audit keamanan sistem dan cek log aktivitas atau error aplikasi.',
  },
  {
    id: 'monthly-summary',
    title: 'Ringkasan Bulanan',
    desc: 'Laporan eksekutif pemasukan, pengeluaran & profit',
    icon: PieChart,
    badge: 'Laporan',
    prompt: 'Buatkan ringkasan performa bisnis dan estimasi profit bulan ini.',
  },
  {
    id: 'slow-products',
    title: 'Analisis Slow-Moving',
    desc: 'Identifikasi produk yang jarang terjual & solusi',
    icon: Layers,
    badge: 'Inventori',
    prompt: 'Produk mana yang perputarannya lambat (slow-moving) dan apa rekomendasinya?',
  },
]

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  sender: 'assistant',
  text: 'Halo! Saya **Asisten AI Zetass POS**.\n\nSaya dapat membantu Anda menganalisis transaksi, mendeteksi stok kritis, menghitung HPP, hingga mengaudit keamanan sistem toko Anda.\n\nKetik pertanyaan Anda atau pilih salah satu menu rekomendasi di bawah untuk memulai.',
  timestamp: new Date(),
}

function loadSavedSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return parsed.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      messages: (s.messages || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
    }))
  } catch {
    return []
  }
}

function saveSessionsToStorage(sessions: ChatSession[]) {
  try {
    const trimmed = sessions.map(s => ({
      ...s,
      messages: s.messages.slice(-MAX_STORED_MESSAGES),
    }))
    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(trimmed))
  } catch {}
}

export default function Assistant() {
  const navigate = useNavigate()
  const toast = useToast()
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null)
  const [testingAi, setTestingAi] = useState(false)
  
  // Multi-session state
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isInfoOpen, setIsInfoOpen] = useState(true)
  
  // Current chat state
  const [inputMessage, setInputMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [thinkingStep, setThinkingStep] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const [streamingText, setStreamingText] = useState<string>('')
  
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initial sessions load
  useEffect(() => {
    const loaded = loadSavedSessions()
    if (loaded.length > 0) {
      setSessions(loaded)
      const lastActive = localStorage.getItem(STORAGE_ACTIVE_KEY) || loaded[0].id
      setActiveSessionId(lastActive)
    } else {
      const defaultSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: 'Percakapan Baru',
        createdAt: new Date(),
        isPinned: false,
        messages: [WELCOME_MESSAGE],
      }
      setSessions([defaultSession])
      setActiveSessionId(defaultSession.id)
    }
  }, [])

  // Load AI config & summary
  useEffect(() => {
    api<AiConfig>('integrations:get').then(r => {
      if (r.success && r.data) setAiConfig(r.data)
    })
    api<DashboardSummary>('dashboard:getSummary').then(r => {
      if (r.success && r.data) setSummary(r.data)
      setLoadingSummary(false)
    }).catch(() => setLoadingSummary(false))
  }, [])

  // Save sessions & active ID
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessionsToStorage(sessions)
      localStorage.setItem(STORAGE_ACTIVE_KEY, activeSessionId)
    }
  }, [sessions, activeSessionId])

  // Current active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]
  const currentMessages = activeSession?.messages || []

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback((smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom()
    }
  }, [currentMessages, thinkingStep, streamingText, isScrolledUp, scrollToBottom])

  // Scroll detector
  const handleScroll = () => {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const scrolled = scrollHeight - scrollTop - clientHeight > 120
    setIsScrolledUp(scrolled)
  }

  // Create New Session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Percakapan Baru',
      createdAt: new Date(),
      isPinned: false,
      messages: [WELCOME_MESSAGE],
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setInputMessage('')
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  // Delete Session
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    if (updated.length === 0) {
      const freshSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: 'Percakapan Baru',
        createdAt: new Date(),
        isPinned: false,
        messages: [WELCOME_MESSAGE],
      }
      setSessions([freshSession])
      setActiveSessionId(freshSession.id)
    } else {
      setSessions(updated)
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id)
      }
    }
    toast('Percakapan dihapus', 'info')
  }

  // Toggle Pin Session
  const togglePinSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s))
  }

  // Add Message to Active Session
  const addMessageToActiveSession = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const fullMsg: Message = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    }

    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s
      
      // Auto update title from first user prompt
      const isFirstUserMsg = !s.messages.some(m => m.sender === 'user') && msg.sender === 'user'
      const newTitle = isFirstUserMsg
        ? (msg.text.length > 28 ? msg.text.slice(0, 28) + '...' : msg.text)
        : s.title

      return {
        ...s,
        title: newTitle,
        messages: [...s.messages, fullMsg],
      }
    }))

    return fullMsg
  }

  // Send Message Logic
  const handleSendMessage = async (textOverride?: string) => {
    const promptText = (textOverride || inputMessage).trim()
    if (!promptText || isGenerating) return

    addMessageToActiveSession({ sender: 'user', text: promptText })
    setInputMessage('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    setIsGenerating(true)
    setThinkingStep('Menganalisis data POS & konteks...')

    try {
      // Simulate multi-stage thinking steps
      setTimeout(() => setThinkingStep('Memproses parameter & menyiapkan jawaban...'), 400)

      const r = await api<{ answer: string; provider: string; online: boolean }>('assistant:ask', {
        question: promptText,
        summary: summary ?? undefined,
      })

      setThinkingStep(null)

      const rawAnswer = r.success && r.data?.answer
        ? r.data.answer
        : buildLocalAssistantResponse(promptText, summary ?? undefined)

      const provider = r.data?.provider ?? (aiConfig?.aiEnabled ? 'AI Online' : 'Lokal')
      const online = r.data?.online ?? false

      // Stream text character by character for premium feeling
      setStreamingText('')
      let currentStr = ''
      const chars = rawAnswer.split('')
      const stepSize = Math.max(1, Math.floor(chars.length / 35))

      for (let i = 0; i < chars.length; i += stepSize) {
        currentStr += chars.slice(i, i + stepSize).join('')
        setStreamingText(currentStr)
        await new Promise(res => setTimeout(res, 12))
      }

      setStreamingText('')
      addMessageToActiveSession({
        sender: 'assistant',
        text: rawAnswer,
        provider,
        online,
      })
    } catch {
      setThinkingStep(null)
      setStreamingText('')
      const fallback = buildLocalAssistantResponse(promptText, summary ?? undefined)
      addMessageToActiveSession({
        sender: 'assistant',
        text: fallback,
        provider: 'Lokal (Offline)',
        online: false,
      })
    } finally {
      setIsGenerating(false)
      setThinkingStep(null)
      setStreamingText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast('Teks disalin ke clipboard', 'success')
    } catch {
      toast('Gagal menyalin', 'error')
    }
  }

  const testAiConnection = async () => {
    setTestingAi(true)
    const r = await api<{ provider: string; model: string; answer: string }>('integrations:testAi')
    setTestingAi(false)
    if (r.success) {
      toast(`AI terhubung: ${r.data?.provider ?? ''} / ${r.data?.model ?? ''}`, 'success')
      addMessageToActiveSession({
        sender: 'assistant',
        text: `✅ **Koneksi AI Berhasil!**\n\n• **Provider**: ${r.data?.provider ?? '-'}\n• **Model**: ${r.data?.model ?? '-'}\n• **Respon**: ${r.data?.answer ?? 'OK'}`,
        provider: r.data?.provider ?? 'AI Online',
        online: true,
      })
    } else {
      toast(r.message as string ?? 'Koneksi AI gagal', 'error')
      addMessageToActiveSession({
        sender: 'assistant',
        text: `⚠️ **Koneksi AI Gagal**\n\n${r.message ?? 'Periksa konfigurasi AI Anda di menu Pengaturan.'}`,
        provider: 'System',
        online: false,
      })
    }
  }

  const aiOnlineReady = aiConfig?.aiEnabled && aiConfig.aiProvider !== 'local' && !!aiConfig.aiApiKey
  const aiProviderLabel = PROVIDER_LABELS[aiConfig?.aiProvider ?? 'local'] ?? aiConfig?.aiProvider ?? 'Lokal'

  // Filtered sessions for sidebar
  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  const pinnedSessions = filteredSessions.filter(s => s.isPinned)
  const unpinnedSessions = filteredSessions.filter(s => !s.isPinned)

  const isOnlyWelcomeMessage = currentMessages.length <= 1

  return (
    <div className="flex h-[calc(100vh-100px)] sm:h-[calc(100vh-76px)] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* ════════════════════════════════════════════════════════════════
          1. LEFT SIDEBAR (CHATS & HISTORY)
          ════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out lg:static lg:z-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-72'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={createNewSession}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Chat Baru</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari riwayat chat..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-2.5 space-y-3 scrollbar-thin">
          {/* Pinned Chats */}
          {pinnedSessions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Pin size={10} className="rotate-45" /> Dipin
              </div>
              <div className="space-y-0.5 mt-1">
                {pinnedSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-all ${
                      activeSessionId === session.id
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <MessageSquare size={14} className="shrink-0 text-slate-400 group-hover:text-red-500" />
                    <span className="truncate flex-1">{session.title}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        onClick={e => togglePinSession(session.id, e)}
                        className="p-1 hover:text-amber-500 rounded"
                      >
                        <Pin size={12} className="fill-current" />
                      </span>
                      <span
                        onClick={e => deleteSession(session.id, e)}
                        className="p-1 hover:text-red-500 rounded"
                      >
                        <Trash2 size={12} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unpinned Sessions */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Riwayat Percakapan
            </div>
            <div className="space-y-0.5 mt-1">
              {unpinnedSessions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  Belum ada riwayat
                </div>
              ) : (
                unpinnedSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all ${
                      activeSessionId === session.id
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <MessageSquare size={14} className="shrink-0 text-slate-400 group-hover:text-red-500" />
                    <span className="truncate flex-1">{session.title}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        onClick={e => togglePinSession(session.id, e)}
                        className="p-1 hover:text-amber-500 rounded"
                        title="Pin chat"
                      >
                        <Pin size={12} />
                      </span>
                      <span
                        onClick={e => deleteSession(session.id, e)}
                        className="p-1 hover:text-red-500 rounded"
                        title="Hapus chat"
                      >
                        <Trash2 size={12} />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings size={15} />
            <span>Pengaturan AI</span>
          </button>
          <button
            onClick={() => {
              setSessions([])
              createNewSession()
              toast('Semua riwayat dibersihkan', 'info')
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Hapus Semua Riwayat"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </aside>

      {/* Sidebar Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════
          2. CENTER CHAT AREA
          ════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
        {/* Header Bar */}
        <header className="h-14 px-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <MessageSquare size={16} />
            </button>

            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Bot size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Zetass AI Assistant
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {aiProviderLabel} {aiConfig?.aiModel ? `• ${aiConfig.aiModel}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={testAiConnection}
              disabled={testingAi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={testingAi ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Tes AI</span>
            </button>

            <button
              onClick={() => setIsInfoOpen(prev => !prev)}
              className={`p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                isInfoOpen ? 'bg-slate-100 dark:bg-slate-800' : ''
              }`}
              title="Panel Informasi AI"
            >
              <Cpu size={16} />
            </button>
          </div>
        </header>

        {/* Chat Stream & Hero Content */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin"
        >
          <div className="max-w-[880px] mx-auto space-y-6">
            {/* AI Disabled / Unconfigured Warning Header Banner */}
            {aiConfig && !aiOnlineReady && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-3">
                <ZapOff size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    Mode AI Online Belum Aktif
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                    Asisten saat ini menggunakan **Mode Lokal Offline**. Aktifkan API key di Pengaturan untuk respon yang lebih cerdas.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
                >
                  Pengaturan
                </button>
              </div>
            )}

            {/* EMPTY STATE HERO SECTION */}
            {isOnlyWelcomeMessage && (
              <div className="py-6 sm:py-10 text-center space-y-6 animate-fade-in">
                <div className="relative inline-block">
                  <div className="w-16 h-16 rounded-3xl bg-red-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-red-500/20">
                    <Bot size={36} />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Apa yang bisa saya bantu hari ini?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ajukan pertanyaan seputar analisis transaksi, prediksi persediaan stok, HPP produk, atau keamanan data toko Anda.
                  </p>
                </div>

                {/* Quick Action Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left pt-2">
                  {QUICK_ACTIONS.map(action => {
                    const IconComponent = action.icon
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleSendMessage(action.prompt)}
                        className="group p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-red-500 dark:hover:border-red-500 hover:shadow-md transition-all text-left flex flex-col justify-between gap-3 active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <IconComponent size={18} />
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {action.badge}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-normal">
                            {action.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MESSAGES LIST */}
            {currentMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Assistant Avatar */}
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`space-y-1.5 max-w-[85%] sm:max-w-[78%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Message Card */}
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-red-600 text-white rounded-br-xs font-normal'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.sender === 'assistant' ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none space-y-2 text-xs sm:text-sm"
                        dangerouslySetInnerHTML={{
                          __html: msg.text
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-red-600 dark:text-red-400">$1</code>')
                            .replace(/\n/g, '<br/>'),
                        }}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.text}</span>
                    )}
                  </div>

                  {/* Message Metadata & Action Toolbar */}
                  <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span>
                      {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender === 'assistant' && msg.provider && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                        • {msg.provider}
                      </span>
                    )}

                    {/* Action Bar for AI Responses */}
                    {msg.sender === 'assistant' && (
                      <div className="flex items-center gap-1 ml-2 opacity-80 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="p-1 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                          title="Salin Pesan"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                        <button
                          onClick={() => handleSendMessage(currentMessages[currentMessages.indexOf(msg) - 1]?.text || 'Jelaskan lagi')}
                          className="p-1 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                          title="Regenerate Jawaban"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button
                          className="p-1 hover:text-amber-500 rounded transition-colors"
                          title="Bookmark"
                        >
                          <Bookmark size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm mt-0.5">
                    U
                  </div>
                )}
              </div>
            ))}

            {/* THINKING & STREAMING INDICATOR */}
            {isGenerating && (
              <div className="flex gap-3 items-start animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={16} className="animate-pulse" />
                </div>
                <div className="space-y-2 flex-1 max-w-[80%]">
                  {thinkingStep && (
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Sparkles size={14} className="text-red-500 animate-spin" />
                      <span className="font-medium animate-pulse">{thinkingStep}</span>
                    </div>
                  )}
                  {streamingText && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                      <span className="whitespace-pre-wrap">{streamingText}</span>
                      <span className="inline-block w-1.5 h-4 ml-1 bg-red-600 animate-pulse align-middle" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Scroll To Bottom Floating Button */}
        {isScrolledUp && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-6 z-20 p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowDown size={14} />
            <span>Scroll ke bawah</span>
          </button>
        )}

        {/* ════════════════════════════════════════════════════════════════
            3. FLOATING CHAT COMPOSER (INPUT BAR)
            ════════════════════════════════════════════════════════════════ */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
          <div className="max-w-[880px] mx-auto space-y-2">
            {/* Floating Input Box */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all p-2">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Tanyakan sesuatu ke Zetass AI... (Ctrl + Enter untuk mengirim)"
                disabled={isGenerating}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-36 scrollbar-thin"
              />

              <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                    title="Lampirkan File / Gambar"
                  >
                    <Paperclip size={16} />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" />
                  <button
                    onClick={() => toast('Fitur input suara segera hadir', 'info')}
                    className="p-1.5 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                    title="Input Suara"
                  >
                    <Mic size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Shift + Enter = Baris baru
                  </span>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isGenerating || !inputMessage.trim()}
                    className="p-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white disabled:opacity-40 disabled:scale-100 transition-all shadow-sm"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════
          4. RIGHT PANEL (AI TELEMETRY & STATS)
          ════════════════════════════════════════════════════════════════ */}
      {isInfoOpen && (
        <aside className="w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 hidden xl:flex flex-col gap-4 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={15} className="text-red-500" /> Information Panel
            </h3>
            <button
              onClick={() => setIsInfoOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X size={14} />
            </button>
          </div>

          {/* Active Model Spec Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Provider AI</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{aiProviderLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Model Active</span>
              <span className="text-xs font-mono text-red-600 dark:text-red-400 font-medium truncate max-w-[120px]">
                {aiConfig?.aiModel || 'default'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Status Modus</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                aiOnlineReady ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
              }`}>
                {aiOnlineReady ? 'Online (Cloud)' : 'Lokal (Offline)'}
              </span>
            </div>
          </div>

          {/* Telemetry Stats */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Telemetry Performance</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block">Latency</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">~120ms</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block">Context Window</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">128K</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block">Total Chat</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentMessages.length}</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] text-slate-400 block">System Guard</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Aktif</span>
              </div>
            </div>
          </div>

          {/* POS Capabilities */}
          <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 space-y-2">
            <h4 className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Kapabilitas Asisten
            </h4>
            <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
              <li>• Analisis laporan penjualan harian</li>
              <li>• Notifikasi & rekomendasi stok kritis</li>
              <li>• Kalkulasi HPP & estimasi profit</li>
              <li>• Deteksi kegagalan & audit log</li>
            </ul>
          </div>
        </aside>
      )}
    </div>
  )
}
