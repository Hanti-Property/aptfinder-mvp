'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { sanitizeHtml } from '@/lib/noteHtml'

interface Note {
  id: string
  title: string
  category: string
  content: string
  bottom_line: string
  created_at: string
  thumbnail?: string | null
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

        {note.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={note.thumbnail} alt={note.title} className="w-full rounded-lg mb-4 object-cover max-h-72" />
        )}

        <div
          style={{color:'#374151'}}
          className="note-content text-sm leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.content) }}
        />

        {note.bottom_line && note.bottom_line.replace(/<[^>]+>/g, '').trim() && (
          <div className="bg-amber-50 border-l-4 border-[#C49A3C] p-3 rounded-r-lg">
            <p className="text-sm text-[#C49A3C] font-semibold">📌 Bottom Line</p>
            <div
              style={{color:'#374151'}}
              className="note-content text-sm mt-1"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.bottom_line) }}
            />
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

      <style jsx global>{`
        .note-content h3 { font-size: 1.05rem; font-weight: 700; margin: 0.8rem 0 0.4rem; color: #111827; }
        .note-content ul { list-style: disc; padding-left: 1.4rem; margin: 0.5rem 0; }
        .note-content ol { list-style: decimal; padding-left: 1.4rem; margin: 0.5rem 0; }
        .note-content li { margin: 0.2rem 0; }
        .note-content blockquote { border-left: 3px solid #1B3A5C; padding-left: 0.75rem; color: #555; margin: 0.6rem 0; }
        .note-content a { color: #1d4ed8; text-decoration: underline; }
        .note-content p { margin: 0.5rem 0; }
        .note-content b, .note-content strong { font-weight: 700; }
      `}</style>
    </div>
  )
}
