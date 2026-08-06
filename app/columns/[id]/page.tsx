'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Column {
  id: string
  series: string
  episode: number
  title: string
  content: string
  bottom_line: string
  author: string
  author_field: string
  created_at: string
}

export default function ColumnDetailPage() {
  const params = useParams()
  const [col, setCol] = useState<Column | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('expert_columns')
        .select('*')
        .eq('id', params.id)
        .single()
      if (data) setCol(data)
      setLoading(false)
    }
    fetch()
  }, [params.id])

  if (loading) return <div className="p-4 text-center">로딩 중...</div>
  if (!col) return <div className="p-4 text-center">칼럼을 찾을 수 없습니다.</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4">
        <a href="/columns" className="text-sm opacity-80">← 칼럼 목록</a>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm bg-[#C49A3C] text-white px-2 py-0.5 rounded">{col.series}</span>
          <span className="text-sm text-gray-500">#{col.episode}</span>
          <span className="text-sm text-gray-400">
            {new Date(col.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'2-digit', day:'2-digit'})}
          </span>
        </div>

        <h1 style={{color:'#111827'}} className="text-2xl font-bold mb-4">{col.title}</h1>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <div className="w-8 h-8 bg-[#1B3A5C] rounded-full flex items-center justify-center text-white text-xs font-bold">
            {col.author?.charAt(0)}
          </div>
          <div>
            <p style={{color:'#111827'}} className="text-sm font-semibold">{col.author}</p>
            <p className="text-xs text-gray-500">{col.author_field}</p>
          </div>
        </div>

        <div style={{color:'#374151'}} className="text-base leading-relaxed whitespace-pre-wrap mb-6">
          {col.content}
        </div>

        {col.bottom_line && (
          <div className="bg-amber-50 border-l-4 border-[#C49A3C] p-4 rounded-r-lg mb-6">
            <p className="text-base text-[#C49A3C] font-bold mb-1">📌 Bottom Line</p>
            <p style={{color:'#374151'}} className="text-base">{col.bottom_line}</p>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 mb-4">
          본 콘텐츠는 투자 권유가 아니며, 투자 판단의 책임은 본인에게 있습니다.
        </div>

        <div className="flex gap-2">
          <a href="/columns" className="flex-1 p-3 bg-gray-100 text-center rounded-lg text-sm">← 목록</a>
          <a href="/inquiry" className="flex-1 p-3 bg-[#1B3A5C] text-white text-center rounded-lg text-sm font-semibold">상담 신청하기</a>
        </div>
      </div>
    </div>
  )
}
