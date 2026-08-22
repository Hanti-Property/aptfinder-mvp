'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['시세', '정책', '매물', '금융', '분석', '학군', '재건축']

export default function NoteEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [form, setForm] = useState({
    title: '',
    category: '',
    content: '',
    bottom_line: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchNote() {
      const { data, error } = await supabase
        .from('research_notes')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setForm({
        title: data.title || '',
        category: data.category || '',
        content: data.content || '',
        bottom_line: data.bottom_line || '',
      })
      setLoading(false)
    }
    fetchNote()
  }, [id])

  async function handleSubmit() {
    if (!form.title || !form.category || !form.content) {
      alert('제목, 카테고리, 본문은 필수입니다.')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('research_notes')
      .update({
        title: form.title,
        category: form.category,
        content: form.content,
        bottom_line: form.bottom_line,
      })
      .eq('id', id)

    setSaving(false)
    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      alert('✅ 노트가 수정되었습니다!')
      router.push('/admin/notes/list')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto flex flex-col items-center justify-center p-4">
        <p className="text-lg font-semibold text-gray-600 mb-4">노트를 찾을 수 없습니다.</p>
        <a href="/admin/notes/list" className="text-sm text-[#1B3A5C] underline">← 목록으로 돌아가기</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-xl font-semibold">리서치 노트 수정</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* 카테고리 선택 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">카테고리 *</label>
          <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}>
            <option value="">-- 카테고리 선택 --</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">제목 *</label>
          <input type="text" placeholder="예) 은마아파트 분담금 8개월 새 급등"
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>

        {/* 본문 */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">본문 (300~500자) *</label>
          <textarea placeholder="핵심 내용을 간결하게 작성하세요." rows={8}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })} />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.content.length}자</p>
        </div>

        {/* Bottom Line */}
        <div>
          <label className="text-sm text-gray-600 font-semibold">📌 Bottom Line</label>
          <textarea placeholder="이 정보가 매수/전세/투자 판단에 어떤 의미인지 결론을 제시하세요." rows={3}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none bg-blue-50"
            value={form.bottom_line}
            onChange={e => setForm({ ...form, bottom_line: e.target.value })} />
        </div>

        {/* 저장 버튼 */}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold text-base disabled:opacity-50">
          {saving ? '저장 중...' : '수정 완료'}
        </button>

        {/* 하단 네비게이션 */}
        <div className="flex gap-2">
          <a href="/admin/notes/list" className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">← 목록으로</a>
          <a href={`/notes/${id}`} className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">👁️ 미리보기</a>
        </div>
      </div>
    </div>
  )
}
