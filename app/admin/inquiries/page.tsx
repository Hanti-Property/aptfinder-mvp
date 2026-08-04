'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Inquiry {
  id: string
  name: string
  phone: string
  message: string
  created_at: string
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setInquiries(data)
      setLoading(false)
    }
    fetch()
  }, [])

  function formatDate(d: string) {
    const date = new Date(d)
    return `${date.getFullYear()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
  }

  if (loading) return <div className="p-4 text-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">상담 신청 목록</h1>
        <p className="text-xs opacity-70">관리자 전용</p>
      </header>

      <div className="p-4">
        <p className="text-sm text-gray-600 mb-3">총 {inquiries.length}건</p>

        {inquiries.length === 0 ? (
          <p className="text-center text-gray-400 py-8">접수된 상담이 없습니다.</p>
        ) : (
          inquiries.map(inq => (
            <div key={inq.id} className="border border-gray-200 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center mb-2">
                <strong className="text-sm">{inq.name}</strong>
                <span className="text-[10px] text-gray-400">{formatDate(inq.created_at)}</span>
              </div>
              <p className="text-sm text-[#1B3A5C] font-semibold mb-1">{inq.phone}</p>
              {inq.message && (
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{inq.message}</p>
              )}
            </div>
          ))
        )}

        <a href="/" className="block text-center text-xs text-gray-500 underline mt-4">← 홈으로</a>
      </div>
    </div>
  )
}
