'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SERIES_LIST = [
  '강남 재건축 투자 가이드',
  '강남 아파트 세무 전략',
  '대치동 학군 리포트',
  '강남아파트 시장 전망',
  '강남 아파트 단지별 리포트',
]

export default function ColumnEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [form, setForm] = useState({
    series: '',
    episode: 1,
    title: '',
    content: '',
    bottom_line: '',
    author: '',
    author_field: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchColumn() {
      const { data, error } = await supabase
        .from('expert_columns')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setForm({
        series: data.series || '',
        episode: data.episode || 1,
        title: data.title || '',
        content: data.content || '',
        bottom_line: data.bottom_line || '',
        author: data.author || '',
        author_field: data.author_field || '',
      })
      setLoading(false)
    }
    fetchColumn()
  }, [id])

  async function handleSubmit() {
    if (!form.series || !form.title || !form.content) {
      alert('시리즈, 제목, 본문은 필수입니다.')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('expert_columns')
      .update({
        series: form.series,
        episode: form.episode,
        title: form.title,
        content: form.content,
        bottom_line: form.bottom_line,
        author: form.author,
        author_field: form.author_field,
      })
      .eq('id', id)

    setSaving(false)
    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      alert('✅ 칼럼이 수정되었습니다!')
      router.push('/admin/columns/list')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto flex flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold text-gray-600 mb-4">칼럼을 찾을 수 없습니다.</p>
        <a href="/admin/columns/list" className="text-sm text-[#1B3A5C] underline">← 목록으로 돌아가기</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-xl font-semibold">칼럼 수정</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* 시리즈 선택 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">시리즈 *</label>
          <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.series}
            onChange={e => setForm({ ...form, series: e.target.value })}>
            <option value="">-- 시리즈 선택 --</option>
            {SERIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* 회차 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">회차</label>
          <input type="number" min={1}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.episode}
            onChange={e => setForm({ ...form, episode: Number(e.target.value) })} />
        </div>

        {/* 제목 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">제목 *</label>
          <input type="text" placeholder="예) 은마아파트 재건축, 지금이 진입 타이밍인가?"
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>

        {/* 본문 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">본문 *</label>
          <textarea placeholder="분석 내용을 작성하세요." rows={12}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })} />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.content.length}자</p>
        </div>

        {/* Bottom Line */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">📌 Bottom Line</label>
          <textarea placeholder="이 칼럼의 핵심 결론과 독자가 취해야 할 행동을 정리하세요." rows={3}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none bg-blue-50"
            value={form.bottom_line}
            onChange={e => setForm({ ...form, bottom_line: e.target.value })} />
        </div>

        {/* 작성자 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 font-semibold">작성자</label>
            <input type="text"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.author}
              onChange={e => setForm({ ...form, author: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-gray-600 font-semibold">전문분야</label>
            <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.author_field}
              onChange={e => setForm({ ...form, author_field: e.target.value })}>
              <option>공인중개사</option>
              <option>세무사</option>
              <option>법무사</option>
              <option>대출전문가</option>
              <option>감정평가사</option>
              <option>재건축전문가</option>
            </select>
          </div>
        </div>

        {/* 버튼 */}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold text-base disabled:opacity-50">
          {saving ? '저장 중...' : '수정 완료'}
        </button>

        <div className="flex gap-2">
          <a href="/admin/columns/list" className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">← 목록으로</a>
          <a href={`/columns/${id}`} className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">👁️ 미리보기</a>
        </div>
      </div>
    </div>
  )
}
