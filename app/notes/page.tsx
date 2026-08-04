'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Note {
  id: string
  title: string
  category: string
  content: string
  bottom_line: string
  author: string
  created_at: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('research_notes')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setNotes(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = filter ? notes.filter(n => n.category === filter) : notes

  function getCategoryColor(cat: string) {
    const colors: Record<string, string> = {
      '재건축': 'bg-red-600', '시세': 'bg-[#1B3A5C]', '정책': 'bg-green-600',
      '금융': 'bg-orange-500', '학군': 'bg-purple-700', '매물': 'bg-gray-600', '분석': 'bg-teal-600'
    }
    return colors[cat] || 'bg-gray-500'
  }

  function formatDate(d: string) {
    const date = new Date(d)
    return `${date.getMonth()+1}.${date.getDate().toString().padStart(2,'0')}`
  }

  if (loading) return <div className="p-4 text-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">리서치 노트</h1>
      </header>

      <div className="p-4">
        {/* 카테고리 필터 */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {['', '시세', '재건축', '정책', '금융', '학군', '매물', '분석'].map(cat => (
            <button key={cat}
              className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap border
                ${filter === cat ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setFilter(cat)}>
              {cat || '전체'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">등록된 노트가 없습니다.</p>
        ) : (
          filtered.map(note => (
            <div key={note.id}
              onClick={() => router.push(`/admin/notes/edit?id=${note.id}`)}
              className="border border-gray-200 rounded-lg p-3 mb-2 hover:bg-gray-50 cursor-pointer">
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[9px] text-white px-1.5 py-0.5 rounded ${getCategoryColor(note.category)}`}>
                  {note.category}
                </span>
                <span className="text-[10px] text-gray-400">{formatDate(note.created_at)}</span>
              </div>
              <p style={{color:'#111827'}} className="text-sm font-semibold mb-1">{note.title}</p>
              <p style={{color:'#374151'}} className="text-xs line-clamp-2">{note.content}</p>
              {note.bottom_line && (
                <p className="text-xs text-[#C49A3C] mt-1">📌 {note.bottom_line}</p>
              )}
              <p className="text-[10px] text-blue-500 mt-1">✏️ 클릭하여 수정</p>
            </div>
          ))
        )}

        <a href="/admin/notes"
          className="block w-full p-3 bg-[#1B3A5C] text-white text-center rounded-lg font-semibold mt-4">
          + 새 노트 작성
        </a>

        <a href="/" className="block text-center text-xs text-gray-500 underline mt-3">← 홈으로</a>
      </div>
    </div>
  )
}
