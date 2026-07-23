import { useEffect, useState, useRef, useCallback } from 'react'
import { Bot, Send, Trash2, Sparkles, ShoppingCart, TrendingUp, AlertTriangle, HelpCircle } from 'lucide-react'
import Button from '../components/Button'
import { api } from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import { buildLocalAssistantResponse } from '../../shared/dashboardAssistant'
import type { DashboardSummary } from '../../shared/types'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: Date
}

const assistantSuggestions = [
  { text: 'Jelaskan topik ini', icon: <HelpCircle size={14} /> },
  { text: 'Buat ringkasan singkat', icon: <Sparkles size={14} /> },
  { text: 'Beri ide atau rekomendasi', icon: <TrendingUp size={14} /> },
  { text: 'Pemasukan hari ini', icon: <ShoppingCart size={14} /> },
  { text: 'Stok menipis', icon: <AlertTriangle size={14} /> },
]

export default function Assistant() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [assistantInput, setAssistantInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya Asisten AI Zetass-Kar. Saya bisa bantu pertanyaan umum, lalu pakai data toko kalau konteksnya memang soal bisnis atau operasional.\n\nCoba tanya apa saja, misalnya:\n• Jelaskan topik tertentu dengan singkat\n• Ringkas teks atau ide\n• Beri rekomendasi\n• Pemasukan hari ini, minggu ini, atau bulan ini\n• Produk terlaris minggu ini\n• Produk yang stoknya menipis',
      timestamp: new Date(),
    },
  ])
  const [assistantLoading, setAssistantLoading] = useState(false)
  const toast = useToast()
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<DashboardSummary>('dashboard:getSummary')
      if (r.success && r.data) {
        setSummary(r.data)
      } else {
        toast('Gagal memuat data dashboard untuk asisten', 'error')
      }
    } catch {
      toast('Gagal memuat data dashboard untuk asisten', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, assistantLoading])

  const askAssistant = useCallback(async (questionText?: string) => {
    const prompt = (questionText ?? assistantInput).trim()
    if (!prompt) return

    // Add user message
    const userMsgId = `user-${Date.now()}`
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: prompt,
        timestamp: new Date(),
      },
    ])
    setAssistantInput('')
    setAssistantLoading(true)

    try {
      const r = await api<{ answer: string; provider: string; online: boolean }>('assistant:ask', {
        question: prompt,
        summary: summary ?? undefined,
      })

      const replyMsgId = `assistant-${Date.now()}`
      if (r.success && r.data?.answer) {
        setMessages(prev => [
          ...prev,
          {
            id: replyMsgId,
            sender: 'assistant',
            text: r.data!.answer,
            timestamp: new Date(),
          },
        ])
      } else {
        // Fallback to local assistant
        const localAnswer = buildLocalAssistantResponse(prompt, summary ?? undefined)
        setMessages(prev => [
          ...prev,
          {
            id: replyMsgId,
            sender: 'assistant',
            text: localAnswer,
            timestamp: new Date(),
          },
        ])
        if (r.message) toast(r.message as string, 'error')
      }
    } catch {
      const replyMsgId = `assistant-${Date.now()}`
      const localAnswer = buildLocalAssistantResponse(prompt, summary ?? undefined)
      setMessages(prev => [
        ...prev,
        {
          id: replyMsgId,
          sender: 'assistant',
          text: localAnswer,
          timestamp: new Date(),
        },
      ])
    } finally {
      setAssistantLoading(false)
    }
  }, [assistantInput, summary, toast])

  const handleAssistantSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    askAssistant()
  }

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'Riwayat percakapan dibersihkan. Ada yang ingin kita bahas lagi?',
        timestamp: new Date(),
      },
    ])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-80px)] space-y-4">
      {/* Header Halaman */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Bot size={26} className="text-primary-500" />
            Asisten AI Pintar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tanya apa saja, dari pertanyaan umum sampai data toko.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={15} />}
          onClick={clearChat}
          className="text-slate-500 hover:text-red-500 transition-colors"
          title="Bersihkan riwayat percakapan"
        >
          <span className="hidden sm:inline">Bersihkan Obrolan</span>
        </Button>
      </div>

      {/* Konten Chat Utama (Spacious) */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Message Box */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-primary-500'
                }`}
              >
                {msg.sender === 'user' ? 'U' : <Bot size={16} />}
              </div>
              <div className="space-y-1">
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-6 whitespace-pre-line shadow-sm border ${
                    msg.sender === 'user'
                      ? 'bg-primary-600 text-white border-primary-600 rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-700/50 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <div
                  className={`text-[10px] text-slate-400 dark:text-slate-500 px-1 ${
                    msg.sender === 'user' ? 'text-right' : ''
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {assistantLoading && (
            <div className="flex gap-3 max-w-[70%]">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-primary-500 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Bot size={16} />
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips and Input Form Box */}
        <div className="border-t border-slate-200/60 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Suggestion Chips */}
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <HelpCircle size={12} />
              Rekomendasi tanya:
            </span>
            {assistantSuggestions.map(suggestion => (
              <button
                key={suggestion.text}
                type="button"
                onClick={() => askAssistant(suggestion.text)}
                disabled={assistantLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 active:scale-95 transition-all shadow-sm"
              >
                {suggestion.icon}
                {suggestion.text}
              </button>
            ))}
          </div>

          {/* Form Input */}
          <form onSubmit={handleAssistantSubmit} className="flex gap-2">
            <input
              value={assistantInput}
              onChange={event => setAssistantInput(event.target.value)}
              placeholder='Tulis pertanyaan apa saja... (contoh: "jelaskan inflasi singkat" atau "pemasukan hari ini")'
              disabled={assistantLoading}
              className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-inner disabled:opacity-50"
            />
            <Button
              type="submit"
              icon={<Send size={15} />}
              className="px-5 shrink-0"
              loading={assistantLoading}
              disabled={assistantLoading || !assistantInput.trim()}
            >
              Kirim
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
