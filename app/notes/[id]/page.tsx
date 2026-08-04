'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Note {
  id: string
  title: string
  category: string
  content: string
  bottom_line: string
  created_at: string
}

export default function NoteDetailPage() {
  const params = useParams()
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('research_notes')
        .select('*')
        .eq('id', params.id)
        .single()
      if (data) setNote(data)
      setLoading(false)
    }
    fetch()
  }, [params.id])

  if (loading) return <div className="p-4 text-center">로딩 중...</div>
  if (!note) return <div className="p-4 text-center">노트를 찾을 수 없습니다.</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4">
        <a href="/notes" className="text-xs opacity-80">← 노트 목록</a>
      </header>

      <div className="p-4">
        <div className="mb-3">
          <span className="text-[10px] bg-[#1B3A5C] text-white px-2 py-0.5 rounded">{note.category}</span>
          <span className="text-[10px] text-gray-400 ml-2">
            {new Date(note.created_at).toLocaleDateString('ko-KR', {year:'numeric', month:'2-digit', day:'2-digit'})}
          </span>
        </div>

        <h1 style={{color:'#111827'}} className="text-lg font-bold mb-4">{note.title}</h1>

        <div style={{color:'#374151'}} className="text-sm leading-relaxed whitespace-pre-wrap mb-4">
          {note.content}
        </div>

        {note.bottom_line && (
          <div className="bg-amber-50 border-l-3 border-[#C49A3C] p-3 rounded-r-lg">
            <p className="text-sm text-[#C49A3C] font-semibold">📌 Bottom Line</p>
            <p style={{color:'#374151'}} className="text-sm mt-1">{note.bottom_line}</p>
          </div>
        )}

        <div className="mt-6 text-center text-[10px] text-gray-400">
          본 콘텐츠는 투자 권유가 아니며, 투자 판단의 책임은 본인에게 있습니다.
        </div>

        <div className="mt-4 flex gap-2">
          <a href="/notes" className="flex-1 p-3 bg-gray-100 text-center rounded-lg text-xs">← 목록으로</a>
          <a href="/inquiry" className="flex-1 p-3 bg-[#1B3A5C] text-white text-center rounded-lg text-xs font-semibold">상담 신청하기</a>
        </div>
      </div>
    </div>
  )
}
