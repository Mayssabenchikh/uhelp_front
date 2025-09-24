'use client'

import { useState, useEffect } from 'react'
import api from '@/services/api'

export default function SuperAdminFaqPage() {
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/pending-faqs')
      setPending(res.data.data ?? res.data)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    await api.post(`/admin/pending-faqs/${id}/approve`)
    load()
  }

  const reject = async (id: number) => {
    await api.post(`/admin/pending-faqs/${id}/reject`)
    load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending FAQs (Superadmin)</h1>
      {loading && <div>Loading...</div>}
      {pending.map((p) => (
        <div key={p.id} className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold">{p.question}</h3>
          <p className="text-sm text-gray-600">{p.answer}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => approve(p.id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
            <button onClick={() => reject(p.id)} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}
