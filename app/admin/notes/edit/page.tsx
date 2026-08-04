'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

function NoteEditContent() {
  const searchParams = useSearchParams()
  const noteId = searchParams.get('id')
  const [form, setForm] = useState({
    title: '',
    category: '',
    content: '',
    bottom_line: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNote() {
      if (!noteId) { setLoading(false); return }
      const { data } = await supabase
        .from('research_notes')
        .select('*')
        .eq('id', noteId)
        .single()
      if (data) {
        setForm({
          title: data.title || '',
          category: data.category || '',
          content: data.content || '',
          bottom_line: data.bottom_line || '',
        })
      }
      setLoading(false)
    }
    fetchNote()
  }, [noteId])

  async function handleSave() {
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
      .eq('id', noteId)
    setSaving(false)
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      alert('수정이 완료되었습니다!')
    }
  }

  async function handleDelete() {
    if (!confirm('이 노트를 삭제하시겠습니까?')) return
    const { error } = await supabase
      .from('research_notes')
      .delete()
      .eq('id', noteId)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      alert('삭제되었습니다.')
      window.location.href = '/notes'
    }
  }

  if (loading) return <div className="p-4 text-center">로딩 중...</div>
  if (!noteId) return <div className="p-4 text-center">노트 ID가 없습니다.</div>

  return (
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
        <input type="text"
          className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
          value={form.title}
          onChange={e => setForm({...form, title: e.target.value})} />
      </div>
      <div>
        <label className="text-xs text-gray-600">본문 *</label>
        <textarea rows={6}
          className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
          value={form.content}
          onChange={e => setForm({...form, content: e.target.value})} />
        <p className="text-[10px] text-gray-400 mt-1 text-right">{form.content.length}자</p>
      </div>
      <div>
        <label className="text-xs text-gray-600">📌 Bottom Line</label>
        <textarea rows={3}
          className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none bg-blue-50"
          value={form.bottom_line}
          onChange={e => setForm({...form, bottom_line: e.target.value})} />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50">
        {saving ? '저장 중...' : '수정 완료'}
      </button>
      <button onClick={handleDelete}
        className="w-full p-3 bg-white text-red-500 border border-red-300 rounded-lg text-sm font-semibold">
        노트 삭제
      </button>
      <a href="/notes" className="block text-center text-xs text-gray-500 underline">← 노트 목록으로</a>
    </div>
  )
}

export default function NoteEditPage() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">리서치 노트 수정</h1>
      </header>
      <Suspense fallback={<div className="p-4 text-center">로딩 중...</div>}>
        <NoteEditContent />
      </Suspense>
    </div>
  )
}
