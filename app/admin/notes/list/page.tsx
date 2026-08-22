'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Note {
  id: string
  title: string
  category: string
  content: string
  bottom_line: string
  status: string
  view_count: number
  published_at: string | null
  created_at: string
}

const CATEGORIES = ['시세', '정책', '매물', '금융', '분석', '학군', '재건축']

export default function NoteListPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    setLoading(true)
    const { data } = await supabase
      .from('research_notes')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 노트를 삭제하시겠습니까?\n\n삭제 후 복구할 수 없습니다.`)) return
    setDeleting(id)
    const { error } = await supabase.from('research_notes').delete().eq('id', id)
    setDeleting(null)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      setNotes(prev => prev.filter(n => n.id !== id))
    }
  }

  const filtered = notes.filter(n => !filterCategory || n.category === filterCategory)

  function formatDate(t: string) {
    return new Date(t).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      '시세': '#2563EB',
      '정책': '#7C3AED',
      '매물': '#059669',
      '금융': '#D97706',
      '분석': '#DC2626',
      '학군': '#0891B2',
      '재건축': '#C49A3C',
    }
    return colors[category] || '#6B7280'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4">
        <h1 className="text-lg font-semibold">📋 노트 관리</h1>
        <p className="text-xs opacity-80 mt-1">리서치 노트 목록 · 수정 · 삭제</p>
      </header>

      <div className="p-4 space-y-4">
        {/* 필터 + 통계 */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">총 <span className="font-bold text-[#1B3A5C]">{filtered.length}</span>개 노트</p>
          <a href="/admin/notes"
            className="px-3 py-1.5 bg-[#1B3A5C] text-white rounded-lg text-sm font-semibold">
            + 새 노트
          </a>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${!filterCategory ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
            onClick={() => setFilterCategory('')}>
            전체
          </button>
          {CATEGORIES.map(c => (
            <button key={c}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${filterCategory === c ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setFilterCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        {/* 노트 목록 */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">등록된 노트가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(note => (
              <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 border-l-4" style={{ borderLeftColor: getCategoryColor(note.category) }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white px-2 py-0.5 rounded" style={{ backgroundColor: getCategoryColor(note.category) }}>
                      {note.category}
                    </span>
                    {note.view_count > 0 && (
                      <span className="text-[10px] text-gray-400">👁️ {note.view_count}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDate(note.created_at)}</span>
                </div>

                <p style={{ color: '#111827' }} className="text-sm font-bold mb-1">{note.title}</p>
                <p style={{ color: '#374151' }} className="text-xs line-clamp-2 mb-2">{note.content}</p>

                {note.bottom_line && (
                  <p className="text-xs text-[#C49A3C] mb-2">📌 {note.bottom_line}</p>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <a href={`/notes/${note.id}`}
                    className="flex-1 text-center py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                    👁️ 미리보기
                  </a>
                  <a href={`/admin/notes/${note.id}/edit`}
                    className="flex-1 text-center py-2 text-xs bg-[#1B3A5C] text-white rounded-lg font-semibold">
                    ✏️ 수정
                  </a>
                  <button
                    onClick={() => handleDelete(note.id, note.title)}
                    disabled={deleting === note.id}
                    className="flex-1 text-center py-2 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                    {deleting === note.id ? '삭제 중...' : '🗑️ 삭제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 하단 네비게이션 */}
        <div className="flex gap-2 pt-2">
          <a href="/admin" className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">← 대시보드</a>
          <a href="/notes" className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">노트 목록 (공개)</a>
        </div>
      </div>
    </div>
  )
}
