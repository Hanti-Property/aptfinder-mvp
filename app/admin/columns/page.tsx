'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SERIES_LIST = [
  '강남 재건축 투자 가이드',
  '강남 아파트 세무 전략',
  '대치동 학군 리포트',
  '강남아파트 시장 전망',
  '강남 아파트 단지별 리포트',
]

export default function ColumnWritePage() {
  const [form, setForm] = useState({
    series: '',
    episode: 1,
    title: '',
    content: '',
    bottom_line: '',
    author: '홍성욱',
    author_field: '공인중개사',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!form.series || !form.title || !form.content) {
      alert('시리즈, 제목, 본문은 필수입니다.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('expert_columns').insert({
      series: form.series,
      episode: form.episode,
      title: form.title,
      content: form.content,
      bottom_line: form.bottom_line,
      author: form.author,
      author_field: form.author_field,
    })
    setSaving(false)
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      alert('✅ 전문가 칼럼이 발행되었습니다!')
      const next = confirm('계속 작성하시겠습니까?\n\n[확인] → 새 칼럼 작성\n[취소] → 칼럼 목록으로 이동')
      if (next) {
        setForm({ ...form, episode: form.episode + 1, title: '', content: '', bottom_line: '' })
        window.scrollTo(0, 0)
      } else {
        window.location.href = '/columns'
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-xl font-semibold">전문가 칼럼 작성</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* 시리즈 선택 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">시리즈 *</label>
          <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.series}
            onChange={e => setForm({...form, series: e.target.value})}>
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
            onChange={e => setForm({...form, episode: Number(e.target.value)})} />
        </div>

        {/* 제목 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">제목 *</label>
          <input type="text" placeholder="예) 은마아파트 재건축, 지금이 진입 타이밍인가?"
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})} />
        </div>

        {/* 본문 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">본문 *</label>
          <textarea placeholder="분석 내용을 작성하세요. 리서치 노트보다 깊이 있는 내용을 담아주세요." rows={12}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            value={form.content}
            onChange={e => setForm({...form, content: e.target.value})} />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.content.length}자</p>
        </div>

        {/* Bottom Line */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">📌 Bottom Line</label>
          <textarea placeholder="이 칼럼의 핵심 결론과 독자가 취해야 할 행동을 정리하세요." rows={3}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none bg-blue-50"
            value={form.bottom_line}
            onChange={e => setForm({...form, bottom_line: e.target.value})} />
        </div>

        {/* 작성자 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600 font-semibold">작성자</label>
            <input type="text"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.author}
              onChange={e => setForm({...form, author: e.target.value})} />
          </div>
          <div>
            <label className="text-sm text-gray-600 font-semibold">전문분야</label>
            <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.author_field}
              onChange={e => setForm({...form, author_field: e.target.value})}>
              <option>공인중개사</option>
              <option>세무사</option>
              <option>법무사</option>
              <option>대출전문가</option>
              <option>감정평가사</option>
              <option>재건축전문가</option>
            </select>
          </div>
        </div>

        {/* 발행 버튼 */}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold text-base disabled:opacity-50">
          {saving ? '저장 중...' : '칼럼 발행하기'}
        </button>

        <a href="/columns" className="block text-center text-sm text-gray-500 underline">← 칼럼 목록 보기</a>
      </div>
    </div>
  )
}
