'use client'

import { useState, useEffect } from 'react'
import { chatService } from '@/services/chatService'
import api, { faqService } from '@/services/api'
import {
  ChevronDown,
  ChevronUp,
  Bot,
  Sparkles,
  Loader2,
  Zap,
  X
} from 'lucide-react'
import i18n from 'i18next'
import { useTranslation } from 'react-i18next'

type RawFAQ = { question: string; answer: string; id?: number; category?: string }

export default function ClientFaqPage() {
  // FAQ browsing
  const [faqs, setFaqs] = useState<RawFAQ[]>([])
  const [loadingFaqs, setLoadingFaqs] = useState(false)
  const [faqError, setFaqError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  // Use global i18n language so sidebar language selector affects this page
  const { t } = useTranslation()
  const [language, setLanguage] = useState<string>(i18n.language || 'en')

  // Ask a question
  const [askQuestion, setAskQuestion] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askResult, setAskResult] = useState<{ faq: any | null; score?: number; source?: string } | null>(null)
  const [askError, setAskError] = useState<string | null>(null)

  // AI generator (keep existing generator functionality)
  const [ticketText, setTicketText] = useState('')
  const [aiFAQ, setAiFAQ] = useState<RawFAQ[]>([])
  const [loadingFAQAI, setLoadingFAQAI] = useState(false)
  const [faqAIError, setFaqAIError] = useState<string | null>(null)
  const [rawFaqText, setRawFaqText] = useState<string | null>(null)
  const [expandedAIFAQ, setExpandedAIFAQ] = useState<number | null>(null)

  // -----------------------------
  // Fetch FAQs
  // -----------------------------
  useEffect(() => {
    const load = async () => {
      setLoadingFaqs(true)
      setFaqError(null)
      try {
        const res = await faqService.getAll({ language })
        // faqService.getAll returns ApiResponse where data is paginator
        const pag = (res && (res as any).data) || null
        const items = Array.isArray(pag?.data) ? pag.data : (pag || [])
        setFaqs(items.map((f: any) => ({ question: f.question, answer: f.answer, id: f.id, category: f.category })))
      } catch (e: any) {
        setFaqError(e?.message || 'Error loading FAQs')
      } finally {
        setLoadingFaqs(false)
      }
    }
    load()
  }, [language])

  // subscribe to i18n language changes so page updates when sidebar language changes
  useEffect(() => {
    const onChange = (lng: string) => setLanguage(lng || 'en')
    i18n.on('languageChanged', onChange)
    return () => { i18n.off('languageChanged', onChange) }
  }, [])

  // -----------------------------
  // Ask matching endpoint
  // -----------------------------
  const ask = async () => {
    if (!askQuestion.trim()) return setAskError('Please enter a question')
    setAskLoading(true)
    setAskError(null)
    setAskResult(null)
    try {
      // Try database match first
      const res = await api.post('/faqs/match', { question: askQuestion, language })
      const payload = res.data?.data ?? null
      if (payload && payload.faq) {
        setAskResult({ faq: payload.faq ?? null, score: payload.score ?? 0, source: payload.source ?? 'db' })
        return
      }

      // No DB result -> fallback to AI generator
      const aiRes = await chatService.generateFAQ(askQuestion)
      if (!aiRes) {
        setAskError('No response from AI')
        return
      }

      console.log('AI Response:', aiRes) // Debug log

      // Try to parse AI response as JSON first
      let parsedAiRes = aiRes
      
      // Handle different response structures
      if (aiRes?.faq_text && typeof aiRes.faq_text === 'string') {
        // If response has faq_text field, try to parse it
        try {
          parsedAiRes = JSON.parse(aiRes.faq_text.trim())
        } catch {
          // If not JSON, check for JSON block in markdown
          const jsonMatch = aiRes.faq_text.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            try {
              parsedAiRes = JSON.parse(jsonMatch[1].trim())
            } catch {
              // Keep original string if JSON parsing fails
              parsedAiRes = aiRes.faq_text
            }
          } else {
            parsedAiRes = aiRes.faq_text
          }
        }
      } else if (typeof aiRes === 'string') {
        try {
          parsedAiRes = JSON.parse(aiRes.trim())
        } catch {
          // If not JSON, check for JSON block in markdown
          const jsonMatch = aiRes.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            try {
              parsedAiRes = JSON.parse(jsonMatch[1].trim())
            } catch {
              // Keep original string if JSON parsing fails
            }
          }
        }
      }

      // If AI returns structured faq array (either direct or parsed)
      if (Array.isArray(parsedAiRes)) {
        if (parsedAiRes.length > 0) {
          const first = parsedAiRes[0]
          const q = first.question ?? first.q ?? askQuestion
          const a = first.answer ?? first.reponse ?? first.a ?? first.body ?? ''
          setAskResult({ faq: { question: String(q).trim(), answer: String(a).trim() }, score: 0, source: 'ai' })
          return
        }
      }

      // If AI returns structured faq array in a property
      if (Array.isArray(parsedAiRes?.faq) && parsedAiRes.faq.length) {
        const first = parsedAiRes.faq[0]
        const q = first.question ?? first.q ?? askQuestion
        const a = first.answer ?? first.reponse ?? first.a ?? first.body ?? ''
        setAskResult({ faq: { question: String(q).trim(), answer: String(a).trim() }, score: 0, source: 'ai' })
        return
      }

      // If AI returns text in faq_text
      if (typeof parsedAiRes?.faq_text === 'string' && parsedAiRes.faq_text.trim()) {
        setAskResult({ faq: { question: askQuestion, answer: parsedAiRes.faq_text.trim() }, score: 0, source: 'ai' })
        return
      }

      // If AI returns a plain string
      if (typeof parsedAiRes === 'string' && parsedAiRes.trim()) {
        const txt = parsedAiRes.trim()
        if (txt.toLowerCase().includes('no precise answer found') || txt.toLowerCase().includes('no answer')) {
          setAskError('AI: No precise answer found.')
          return
        }
        setAskResult({ faq: { question: askQuestion, answer: txt }, score: 0, source: 'ai' })
        return
      }

      // Fallback: try message/data fields
      const fallbackText = aiRes?.message || aiRes?.data || (typeof aiRes === 'object' ? JSON.stringify(aiRes) : null)
      if (typeof fallbackText === 'string' && fallbackText.trim()) {
        // Don't display raw JSON as answer
        if (fallbackText.trim().startsWith('{') || fallbackText.trim().startsWith('[')) {
          setAskError('AI returned structured data but no readable answer could be extracted')
          return
        }
        setAskResult({ faq: { question: askQuestion, answer: fallbackText.trim() }, score: 0, source: 'ai' })
        return
      }

      setAskError('No answer found')
    } catch (e: any) {
      setAskError(e?.response?.data?.message || e?.message || 'Error during search')
    } finally {
      setAskLoading(false)
    }
  }

  // -----------------------------
  // Parsing helpers (copied from existing file)
  // -----------------------------
  const tryParseJson = (text: string): any | null => {
    try {
      return JSON.parse(text)
    } catch {
      const jsonMatch = text.match(/(\[.*\]|\{.*\})/s)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1])
        } catch {
          return null
        }
      }
      return null
    }
  }

  const extractQAPairsWithRegex = (text: string): RawFAQ[] => {
    const out: RawFAQ[] = []
    if (!text || !text.trim()) return out

    const qaPattern = /Q[:\.\-\)]?\s*(.+?)\s*[\r\n]+A[:\.\-\)]?\s*(.+?)(?=(?:\r?\nQ[:\.\-\)]|\r?\n\d+[\)\.]|\r?\n$))/gis
    let m
    while ((m = qaPattern.exec(text)) !== null) {
      const q = m[1].trim()
      const a = m[2].trim()
      if (q && a) out.push({ question: q, answer: a })
    }
    if (out.length) return out

    const numPattern = /(?:\d+\)|\d+\.)\s*(.+?)\s*(?:\r?\n|:)\s*(.+?)(?=(?:\r?\n\d+\)|\r?\n\d+\.|\r?\n$))/gs
    while ((m = numPattern.exec(text)) !== null) {
      const q = m[1].trim()
      const a = m[2].trim()
      if (q && a) out.push({ question: q, answer: a })
    }
    if (out.length) return out

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]
      if (line.endsWith('?') || line.toLowerCase().startsWith('how') || line.toLowerCase().startsWith('why') || line.toLowerCase().startsWith('what')) {
        const q = line
        const a = lines[i + 1]
        out.push({ question: q, answer: a })
        i++
      }
    }
    return out
  }

  const parseModelOutputToFAQ = (raw: any): RawFAQ[] => {
    if (!raw) return []
    if (Array.isArray(raw)) {
      return raw.map((it: any) => {
        const q = it.question ?? it.q ?? it.title ?? ''
        const a = it.answer ?? it.reponse ?? it.a ?? it.body ?? ''
        return { question: String(q || '').trim(), answer: String(a || '').trim() }
      }).filter((it: RawFAQ) => it.question && it.answer)
    }
    if (typeof raw === 'object') {
      for (const k of ['faq', 'faqs', 'items', 'data']) {
        if (Array.isArray((raw as any)[k])) {
          return parseModelOutputToFAQ((raw as any)[k])
        }
      }
      return []
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      const maybe = tryParseJson(trimmed)
      if (maybe) {
        return parseModelOutputToFAQ(maybe)
      }
      const byRegex = extractQAPairsWithRegex(trimmed)
      if (byRegex.length) return byRegex
      const paragraphs = trimmed.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
      const pairs: RawFAQ[] = []
      for (const p of paragraphs) {
        const lines = p.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length >= 2) {
          const q = lines[0]
          const a = lines.slice(1).join(' ')
          if (q.length && a.length) pairs.push({ question: q, answer: a })
        }
      }
      return pairs
    }
    return []
  }

  // -----------------------------
  // Generate AI FAQ from ticket (existing behaviour)
  // -----------------------------
  const generateFAQWithAI = async () => {
    if (!ticketText.trim()) {
      setFaqAIError('Please enter a ticket description')
      return
    }
    setLoadingFAQAI(true)
    setFaqAIError(null)
    setAiFAQ([])
    setRawFaqText(null)

    try {
      const res = await chatService.generateFAQ(ticketText)

      if (!res) {
        setFaqAIError('No response from server')
        return
      }

      if (Array.isArray(res.faq)) {
        const parsed = parseModelOutputToFAQ(res.faq)
        if (parsed.length) {
          setAiFAQ(parsed)
          return
        }
      }

      if (typeof res.faq_text === 'string' && res.faq_text.trim()) {
        const parsed = parseModelOutputToFAQ(res.faq_text)
        if (parsed.length) {
          setAiFAQ(parsed)
          return
        } else {
          setRawFaqText(res.faq_text)
          setFaqAIError('Model returned text but no structured FAQ could be extracted. See raw output below.')
          return
        }
      }

      if (typeof res === 'string' && res.trim()) {
        const parsed = parseModelOutputToFAQ(res)
        if (parsed.length) {
          setAiFAQ(parsed)
          return
        } else {
          setRawFaqText(res)
          setFaqAIError('Model returned text but no structured FAQ could be extracted. See raw output below.')
          return
        }
      }

      const fallbackText = res?.message || res?.data || (typeof res === 'object' ? JSON.stringify(res) : null)
      if (typeof fallbackText === 'string' && fallbackText.trim()) {
        const parsed = parseModelOutputToFAQ(fallbackText)
        if (parsed.length) {
          setAiFAQ(parsed)
          return
        }
      }

      setFaqAIError('No FAQ generated')
    } catch (err: any) {
      setFaqAIError(err?.message || 'Error generating FAQ')
    } finally {
      setLoadingFAQAI(false)
    }
  }

  const toggleAIFAQ = (index: number) => {
    setExpandedAIFAQ(expandedAIFAQ === index ? null : index)
  }

  const clearAll = () => {
    setTicketText('')
    setAiFAQ([])
    setFaqAIError(null)
    setRawFaqText(null)
    setExpandedAIFAQ(null)
  }

  // -----------------------------
  // Filtered list
  // -----------------------------
  const filteredFaqs = faqs.filter(f => {
    if (category && f.category !== category) return false
    if (search && !(f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl shadow-lg">
              <Zap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">{t('faq.title')}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('faq.subtitle')}</p>
        </div>

        {/* Ask form */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Bot className="w-6 h-6 text-cyan-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('faq.askTitle')}</h2>
              <p className="text-gray-600 text-sm">{t('faq.askDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              placeholder={t('faq.placeholder')}
              className="w-full border border-gray-300 rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none bg-white/90 backdrop-blur-sm shadow-sm"
              rows={3}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={ask}
                  disabled={askLoading || !askQuestion.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl hover:from-cyan-700 hover:to-blue-700 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {askLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> <span>{t('actions.search')}</span></> : <><Sparkles className="w-5 h-5" /> <span>{t('faq.searchButton')}</span></>}
                </button>
                <button onClick={() => { setAskQuestion(''); setAskResult(null); setAskError(null) }} className="px-4 py-3 border border-gray-300 rounded-2xl">{t('faq.clearButton')}</button>
              </div>
              <div className="text-sm text-gray-500">{t('faq.languageLabel')}: {language?.toUpperCase()}</div>
            </div>

            {askError && <div className="p-3 bg-red-50 border border-red-200 rounded">{askError}</div>}

            {askResult && (
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">{t('faq.sourceLabel')}: <strong className="ml-2">{askResult.source}</strong></div>
                  <div className="text-sm text-gray-500">{t('faq.confidenceLabel')}: {Math.round((askResult.score ?? 0))}%</div>
                </div>
                {askResult.faq ? (
                  <div>
                    <h3 className="text-lg font-semibold">{askResult.faq.question}</h3>
                    <p className="text-gray-700 mt-2">{askResult.faq.answer}</p>
                  </div>
                ) : (
                  <div className="text-gray-600">{t('faq.noAnswer')}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Generator section (removed) */}

      </div>
    </div>
  )
}