'use client'

import { useEffect, useState } from 'react'
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

export default function ColumnListPage() {
  const [columns, setColumns] = useState<Column[]>([])
  const [filterSeries, setFilterSeries] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchColumns()
  }, [])

  async function fetchColumns() {
    setLoading(true)
    const { data } = await supabase
      .from('expert_columns')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setColumns(data)
    setLoading(false)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 칼럼을 삭제하시겠습니까?\n\n삭제 후 복구할 수 없습니다.`)) return
    setDeleting(id)
    const { error } = await supabase.from('expert_columns').delete().eq('id', id)
    setDeleting(null)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      setColumns(prev => prev.filter(c => c.id !== id))
    }
  }

  const seriesList = [...new Set(columns.map(c => c.series))]
  const filtered = columns.filter(c => !filterSeries || c.series === filterSeries)

  function formatDate(t: string) {
    return new Date(t).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4">
        <h1 className="text-lg font-semibold">📝 칼럼 관리</h1>
        <p className="text-xs opacity-80 mt-1">전문가 칼럼 목록 · 수정 · 삭제</p>
      </header>

      <div className="p-4 space-y-4">
        {/* 필터 + 통계 */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">총 <span className="font-bold text-[#1B3A5C]">{filtered.length}</span>개 칼럼</p>
          <a href="/admin/columns"
            className="px-3 py-1.5 bg-[#1B3A5C] text-white rounded-lg text-sm font-semibold">
            + 새 칼럼
          </a>
        </div>

        {/* 시리즈 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${!filterSeries ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
            onClick={() => setFilterSeries('')}>
            전체
          </button>
          {seriesList.map(s => (
            <button key={s}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${filterSeries === s ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setFilterSeries(s)}>
              {s}
            </button>
          ))}
        </div>

        {/* 칼럼 목록 */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">등록된 칼럼이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(col => (
              <div key={col.id} className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-[#C49A3C]">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-[#C49A3C] text-white px-2 py-0.5 rounded">{col.series}</span>
                    <span className="text-[10px] text-gray-500">#{col.episode}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDate(col.created_at)}</span>
                </div>

                <p style={{ color: '#111827' }} className="text-sm font-bold mb-1">{col.title}</p>
                <p style={{ color: '#374151' }} className="text-xs line-clamp-2 mb-2">{col.content}</p>

                {col.bottom_line && (
                  <p className="text-xs text-[#C49A3C] mb-2">📌 {col.bottom_line}</p>
                )}

                <p className="text-[10px] text-gray-400 mb-3">{col.author} · {col.author_field}</p>

                {/* 액션 버튼 */}
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <a href={`/columns/${col.id}`}
                    className="flex-1 text-center py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                    👁️ 미리보기
                  </a>
                  <a href={`/admin/columns/${col.id}/edit`}
                    className="flex-1 text-center py-2 text-xs bg-[#1B3A5C] text-white rounded-lg font-semibold">
                    ✏️ 수정
                  </a>
                  <button
                    onClick={() => handleDelete(col.id, col.title)}
                    disabled={deleting === col.id}
                    className="flex-1 text-center py-2 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
                    {deleting === col.id ? '삭제 중...' : '🗑️ 삭제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 하단 네비게이션 */}
        <div className="flex gap-2 pt-2">
          <a href="/admin" className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">← 대시보드</a>
          <a href="/columns" className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">칼럼 목록 (공개)</a>
        </div>
      </div>
    </div>
  )
}
