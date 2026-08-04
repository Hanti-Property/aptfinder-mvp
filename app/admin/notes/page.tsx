'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function NoteWritePage() {
  const [form, setForm] = useState({
    title: '',
    category: '',
    content: '',
    bottom_line: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!form.title || !form.category || !form.content) {
      alert('제목, 카테고리, 본문은 필수입니다.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('research_notes').insert({
      title: form.title,
      category: form.category,
      content: form.content,
      bottom_line: form.bottom_line,
    })
    setSaving(false)
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      alert('✅ 리서치 노트가 발행되었습니다!')
      const next = confirm('노트를 계속 작성하시겠습니까?\n\n[확인] → 새 노트 작성\n[취소] → 노트 목록으로 이동')
      if (next) {
        setForm({ title: '', category: '', content: '', bottom_line: '' })
        window.scrollTo(0, 0)
      } else {
        window.location.href = '/notes'
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">리서치 노트 작성</h1>
      </header>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-600">카테고리 *</label>
          <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}>
            <option value="">선택</option>
            <option>시세</option><option>재건축</option><option>정책</option>
            <option>금융</option><option>학군</option><option>매물</option><option>분석</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600">제목 *</label>
          <input type="text" placeholder="예) 은마아파트 분담금 8개월 새 급등"
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})} />
        </div>

        <div>
          <label className="text-xs text-gray-600">본문 (300~500자) *</label>
          <textarea placeholder="핵심 내용을 간결하게 작성하세요." rows={5}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            value={form.content}
            onChange={e => setForm({...form, content: e.target.value})} />
        </div>

        <div>
          <label className="text-xs text-gray-600">📌 Bottom Line</label>
          <textarea placeholder="이 정보가 매수/전세/투자 판단에 어떤 의미인지 결론을 제시하세요." rows={3}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none bg-blue-50"
            value={form.bottom_line}
            onChange={e => setForm({...form, bottom_line: e.target.value})} />
        </div>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50">
          {saving ? '저장 중...' : '노트 발행하기'}
        </button>

        <a href="/notes" className="block text-center text-xs text-gray-500 underline">← 노트 목록 보기</a>
      </div>
    </div>
  )
}
