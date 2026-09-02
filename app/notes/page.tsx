'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { stripHtml } from '@/lib/noteHtml'

interface Note {
  id: string
  title: string
  category: string
  content: string
  bottom_line: string
  created_at: string
  thumbnail?: string | null
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [filter, setFilter] = useState('')
  const [filterTime, setFilterTime] = useState('')
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

  function getTimeFilter(item: Note) {
    if (!filterTime) return true
    const created = new Date(item.created_at)
    const now = new Date()
    if (filterTime === 'today') {
      return created.toDateString() === now.toDateString()
    }
    if (filterTime === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return created >= weekAgo
    }
    if (filterTime === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return created >= monthAgo
    }
    return true
  }

  const filtered = notes
    .filter(n => !filter || n.category === filter)
    .filter(getTimeFilter)

  function getCategoryColor(cat: string) {
    const colors: Record<string, string> = {
      '재건축': 'bg-red-600', '시세': 'bg-[#1B3A5C]', '정책': 'bg-green-600',
      '금융': 'bg-orange-500', '학군': 'bg-purple-700', '매물': 'bg-gray-600', '분석': 'bg-teal-600'
    }
    return colors[cat] || 'bg-gray-500'
  }

  function formatTime(t: string) {
    const d = new Date(t)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return '방금'
    if (diff < 60) return `${diff}분 전`
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`
    if (diff < 10080) return `${Math.floor(diff / 1440)}일 전`
    return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
  }

  if (loading) return <div className="p-4 text-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-xl font-semibold">리서치 노트</h1>
      </header>

      <div className="p-4">
        {/* 카테고리 필터 */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {['', '시세', '재건축', '정책', '금융', '학군', '매물', '분석'].map(cat => (
            <button key={cat}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border
                ${filter === cat ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setFilter(cat)}>
              {cat || '전체'}
            </button>
          ))}
        </div>

        {/* 시간 필터 */}
        <div className="flex gap-2 mb-4">
          <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
            value={filterTime} onChange={e => setFilterTime(e.target.value)}>
            <option value="">전체 기간</option>
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
          </select>
        </div>

        {/* 결과 수 */}
        <p className="text-sm text-gray-500 mb-3">{filtered.length}개 노트</p>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">조건에 맞는 노트가 없습니다.</p>
        ) : (
          filtered.map(note => (
            <div key={note.id}
              onClick={() => router.push(`/notes/${note.id}`)}
              className="border border-gray-200 rounded-lg p-4 mb-3 cursor-pointer hover:bg-gray-50 flex gap-3">
              {note.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={note.thumbnail} alt={note.title}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs text-white px-2 py-0.5 rounded ${getCategoryColor(note.category)}`}>
                    {note.category}
                  </span>
                  <span className="text-sm text-gray-400">{formatTime(note.created_at)}</span>
                </div>
                <p style={{color:'#111827'}} className="text-lg font-semibold mb-1 line-clamp-1">{note.title}</p>
                <p style={{color:'#374151'}} className="text-base line-clamp-2">{stripHtml(note.content)}</p>
                {note.bottom_line && stripHtml(note.bottom_line) && (
                  <p className="text-sm text-[#C49A3C] mt-2 line-clamp-1">📌 {stripHtml(note.bottom_line)}</p>
                )}
              </div>
            </div>
          ))
        )}

        <a href="/" className="block text-center text-sm text-gray-500 underline mt-4">← 홈으로</a>
      </div>
    </div>
  )
}
