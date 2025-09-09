'use client'

import { useState } from 'react'
import { chatService } from '@/services/chatService'
import {
  ChevronDown,
  ChevronUp,
  Bot,
  Sparkles,
  Loader2,
  Zap,
  X
} from 'lucide-react'

type RawFAQ = { question: string; answer: string }

export default function AIFAQGeneratorPage() {
  // AI FAQ Generation
  const [ticketText, setTicketText] = useState('')
  const [aiFAQ, setAiFAQ] = useState<RawFAQ[]>([])
  const [loadingFAQAI, setLoadingFAQAI] = useState(false)
  const [faqAIError, setFaqAIError] = useState<string | null>(null)
  const [rawFaqText, setRawFaqText] = useState<string | null>(null) // show raw model output if parsing fails
  const [expandedAIFAQ, setExpandedAIFAQ] = useState<number | null>(null)

  // -----------------------------
  // Parsing helpers
  // -----------------------------
  const tryParseJson = (text: string): any | null => {
    try {
      return JSON.parse(text)
    } catch {
      // sometimes model returns JSON wrapped in text; try to extract {...}
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

    // pattern 1: Q: ... A: ...
    const qaPattern = /Q[:\.\-\)]?\s*(.+?)\s*[\r\n]+A[:\.\-\)]?\s*(.+?)(?=(?:\r?\nQ[:\.\-\)]|\r?\n\d+[\)\.]|\r?\n$))/gis
    let m
    while ((m = qaPattern.exec(text)) !== null) {
      const q = m[1].trim()
      const a = m[2].trim()
      if (q && a) out.push({ question: q, answer: a })
    }
    if (out.length) return out

    // pattern 2: numbered pairs like "1) Question? Answer..."
    const numPattern = /(?:\d+\)|\d+\.)\s*(.+?)\s*(?:\r?\n|:)\s*(.+?)(?=(?:\r?\n\d+\)|\r?\n\d+\.|\r?\n$))/gs
    while ((m = numPattern.exec(text)) !== null) {
      const q = m[1].trim()
      const a = m[2].trim()
      if (q && a) out.push({ question: q, answer: a })
    }
    if (out.length) return out

    // pattern 3: lines ending with ? followed by next non-empty line = answer
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]
      if (line.endsWith('?') || line.toLowerCase().startsWith('how') || line.toLowerCase().startsWith('why') || line.toLowerCase().startsWith('what')) {
        const q = line
        const a = lines[i + 1]
        out.push({ question: q, answer: a })
        i++ // skip next line as used
      }
    }
    return out
  }

  const parseModelOutputToFAQ = (raw: any): RawFAQ[] => {
    // raw can be an array already
    if (!raw) return []
    if (Array.isArray(raw)) {
      // accept items with question/answer or question/reponse
      return raw.map((it: any) => {
        const q = it.question ?? it.q ?? it.title ?? ''
        const a = it.answer ?? it.reponse ?? it.a ?? it.body ?? ''
        return { question: String(q || '').trim(), answer: String(a || '').trim() }
      }).filter((it: RawFAQ) => it.question && it.answer)
    }
    // if raw is object with keys
    if (typeof raw === 'object') {
      // try to find array fields
      for (const k of ['faq', 'faqs', 'items', 'data']) {
        if (Array.isArray((raw as any)[k])) {
          return parseModelOutputToFAQ((raw as any)[k])
        }
      }
      return []
    }
    // if raw is string -> try JSON then regex then heuristics
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      // try json inside
      const maybe = tryParseJson(trimmed)
      if (maybe) {
        return parseModelOutputToFAQ(maybe)
      }
      // try regex extraction
      const byRegex = extractQAPairsWithRegex(trimmed)
      if (byRegex.length) return byRegex
      // final heuristic: split paragraphs and try create pairs
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
  // Generate AI FAQ from ticket
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

      // res expected shapes:
      // { success: true, faq: [...] } OR
      // { success: true, faq_text: "..." } OR
      // direct string response (rare)
      // or error

      if (!res) {
        setFaqAIError('No response from server')
        return
      }

      // Prefer structured array
      if (Array.isArray(res.faq)) {
        const parsed = parseModelOutputToFAQ(res.faq)
        if (parsed.length) {
          setAiFAQ(parsed)
          return
        }
      }

      // If server returned faq_text
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

      // If server returned a string directly
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

      // If server returned object but no faq fields - try to search object for text
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl shadow-lg">
              <Zap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">AI FAQ Generator</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform tickets, problems, or any text into structured FAQs instantly using artificial intelligence
          </p>
        </div>

        {/* AI FAQ Generator */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Generate FAQ</h2>
                <p className="text-gray-600">Enter your content below to generate structured FAQ pairs</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={ticketText}
                onChange={(e) => setTicketText(e.target.value)}
                placeholder="Paste a ticket description, error message, problem statement, or any content you want to convert to FAQ format..."
                className="w-full border border-gray-300 rounded-2xl p-6 text-gray-800 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none bg-white/90 backdrop-blur-sm shadow-sm min-h-[200px]"
                rows={8}
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={generateFAQWithAI}
                    disabled={loadingFAQAI || !ticketText.trim()}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl hover:from-cyan-700 hover:to-blue-700 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
                  >
                    {loadingFAQAI ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Generating FAQ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        <span>Generate FAQ</span>
                      </>
                    )}
                  </button>
                  {(ticketText || aiFAQ.length > 0) && (
                    <button
                      onClick={clearAll}
                      className="px-6 py-4 border border-gray-300 text-gray-600 rounded-2xl hover:bg-gray-50 flex items-center gap-2 transition-all duration-200 font-medium"
                    >
                      <X className="w-5 h-5" />
                      Clear All
                    </button>
                  )}
                </div>
                {ticketText && (
                  <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                    {ticketText.length} characters
                  </div>
                )}
              </div>
            </div>
            
            {faqAIError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-red-600 font-medium">{faqAIError}</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Generated FAQ Results */}
        {aiFAQ.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-cyan-200 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-cyan-100 rounded-xl">
                <Bot className="w-8 h-8 text-cyan-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">Generated FAQ</h3>
                <p className="text-gray-600">{aiFAQ.length} question{aiFAQ.length > 1 ? 's' : ''} generated successfully</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700 border border-cyan-200">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Generated
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {aiFAQ.map((faq, idx) => {
                const isExpanded = expandedAIFAQ === idx
                return (
                  <div key={idx} className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                    <button
                      onClick={() => toggleAIFAQ(idx)}
                      className="w-full text-left p-6 hover:bg-white/30 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white/60 rounded-lg">
                              <Bot className="w-5 h-5 text-cyan-600" />
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/60 text-cyan-700 border border-cyan-200">
                              Question {idx + 1}
                            </span>
                          </div>
                          <h4 className="text-xl font-semibold text-gray-900 leading-relaxed">{faq.question}</h4>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {isExpanded ? 
                            <ChevronUp className="w-6 h-6 text-cyan-600" /> : 
                            <ChevronDown className="w-6 h-6 text-gray-500" />
                          }
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-white/40">
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 mt-4 shadow-sm">
                          <p className="text-gray-700 leading-8 text-lg">{faq.answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Raw model output (if parsing failed) */}
        {rawFaqText && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-3xl p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Bot className="w-8 h-8 text-yellow-600" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">Raw AI Output</h4>
                <p className="text-gray-600">The AI response couldn't be parsed into structured FAQ format</p>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 overflow-x-auto leading-relaxed">{rawFaqText}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}