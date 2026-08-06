'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ColumnsPage() {
  const [columns, setColumns] = useState<Column[]>([])
  const [filterSeries, setFilterSeries] = useState('')
  const [filterTime, setFilterTime] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('expert_columns')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setColumns(data)
      setLoading(false)
    }
    fetch()
  }, [])

  function getTimeFilter(item: Column) {
    if (!filterTime) return true
    const created = new Date(item.created_at)
    const now = new Date()
    if (filterTime === 'week') return created >= new Date(now.getTime() - 7*24*60*60*1000)
    if (filterTime === 'month') return created >= new Date(now.getTime() - 30*24*60*60*1000)
    return true
  }

  const seriesList = [...new Set(columns.map(c => c.series))]
  const filtered = columns
    .filter(c => !filterSeries || c.series === filterSeries)
    .filter(getTimeFilter)

  function formatTime(t: string) {
    const d = new Date(t)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 60) return `${diff}분 전`
    if (diff < 1440) return `${Math.floor(diff/60)}시간 전`
    if (diff < 10080) return `${Math.floor(diff/1440)}일 전`
    return d.toLocaleDateString('ko-KR', {month:'2-digit', day:'2-digit'})
  }

  if (loading) return <div className="p-4 text-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-xl font-semibold">전문가 칼럼</h1>
      </header>

      <div className="p-4">
        {/* 시리즈 필터 */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          <button className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${!filterSeries ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
            onClick={() => setFilterSeries('')}>전체</button>
          {seriesList.map(s => (
            <button key={s} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${filterSeries === s ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setFilterSeries(s)}>{s}</button>
          ))}
        </div>

        {/* 시간 필터 */}
        <div className="flex gap-2 mb-4">
          <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
            value={filterTime} onChange={e => setFilterTime(e.target.value)}>
            <option value="">전체 기간</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-3">{filtered.length}개 칼럼</p>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">등록된 칼럼이 없습니다.</p>
        ) : (
          filtered.map(col => (
            <div key={col.id} onClick={() => router.push(`/columns/${col.id}`)}
              className="border border-gray-200 rounded-lg p-4 mb-3 cursor-pointer hover:bg-gray-50 border-l-4 border-l-[#C49A3C]">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#C49A3C] text-white px-2 py-0.5 rounded">{col.series}</span>
                  <span className="text-xs text-gray-500">#{col.episode}</span>
                </div>
                <span className="text-xs text-gray-400">{formatTime(col.created_at)}</span>
              </div>
              <p style={{color:'#111827'}} className="text-lg font-bold mb-1">{col.title}</p>
              <p style={{color:'#374151'}} className="text-sm line-clamp-2">{col.content}</p>
              {col.bottom_line && (
                <p className="text-sm text-[#C49A3C] mt-2">📌 {col.bottom_line}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">{col.author} · {col.author_field}</p>
            </div>
          ))
        )}

        <a href="/admin/columns"
          className="block w-full p-3 bg-[#1B3A5C] text-white text-center rounded-lg font-semibold mt-4 text-base">
          + 새 칼럼 작성
        </a>
        <a href="/" className="block text-center text-sm text-gray-500 underline mt-3">← 홈으로</a>
      </div>
    </div>
  )
}
