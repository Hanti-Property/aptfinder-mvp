'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['시세', '재건축', '정책', '금융', '학군', '매물', '분석']

export default function NoteWritePage() {
  const [form, setForm] = useState({
    title: '',
    category: '',
    bottom_line: '',
  })
  const [contentHtml, setContentHtml] = useState('')
  const [thumbUrl, setThumbUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 본문 글자수(태그 제외)
  const plainLen = contentHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
    syncContent()
  }

  function syncContent() {
    if (editorRef.current) setContentHtml(editorRef.current.innerHTML)
  }

  async function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('이미지는 5MB 이하만 가능합니다.'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `research-notes/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('listing-images').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
      setThumbUrl(data.publicUrl)
    } catch (err: unknown) {
      alert('이미지 업로드 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    const content = editorRef.current?.innerHTML || ''
    const plain = content.replace(/<[^>]+>/g, '').trim()
    if (!form.title || !form.category || !plain) {
      alert('제목, 카테고리, 본문은 필수입니다.')
      return
    }
    setSaving(true)
    // thumbnail 컬럼이 없을 수 있으므로, 우선 포함해 시도 → 실패 시 제외하고 재시도
    const base = {
      title: form.title,
      category: form.category,
      content,
      bottom_line: form.bottom_line,
    }
    let { error } = await supabase.from('research_notes').insert({ ...base, thumbnail: thumbUrl || null })
    if (error && /thumbnail/.test(error.message)) {
      // thumbnail 컬럼 미존재 → 제외하고 저장 (컬럼 추가는 아래 안내 참조)
      ;({ error } = await supabase.from('research_notes').insert(base))
      if (!error) console.warn('thumbnail 컬럼이 없어 이미지 URL은 저장되지 않았습니다. research_notes에 thumbnail TEXT 컬럼을 추가하세요.')
    }
    setSaving(false)
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      alert('✅ 리서치 노트가 발행되었습니다!')
      const next = confirm('노트를 계속 작성하시겠습니까?\n\n[확인] → 새 노트 작성\n[취소] → 노트 목록으로 이동')
      if (next) {
        setForm({ title: '', category: '', bottom_line: '' })
        setContentHtml(''); setThumbUrl('')
        if (editorRef.current) editorRef.current.innerHTML = ''
        window.scrollTo(0, 0)
      } else {
        window.location.href = '/notes'
      }
    }
  }

  const btn = 'px-2.5 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 active:bg-gray-200 min-w-[34px]'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A5C] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">리서치 노트 작성</h1>
        <a href="/admin/notes/list" className="text-xs text-blue-200 underline">노트 목록 →</a>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 메타 (카테고리·제목·썸네일) */}
          <div className="lg:col-span-1 space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700">카테고리 *</label>
              <select className="w-full p-3 border border-gray-300 rounded-lg mt-1.5 bg-white"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">선택</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">제목 *</label>
              <input type="text" placeholder="예) 은마아파트 분담금 8개월 새 급등"
                className="w-full p-3 border border-gray-300 rounded-lg mt-1.5"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">썸네일 이미지</label>
              <div className="mt-1.5 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white">
                {thumbUrl ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl} alt="썸네일" className="w-full h-40 object-cover rounded-lg" />
                    <button onClick={() => setThumbUrl('')}
                      className="text-xs text-red-500 underline">이미지 제거</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full py-8 text-gray-400 hover:text-gray-600">
                    {uploading ? '업로드 중...' : '📷 클릭하여 이미지 업로드\n(최대 5MB)'}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleThumb} />
              </div>
            </div>
          </div>

          {/* 우측: 에디터 + Bottom Line */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">본문 *</label>
                <span className={`text-xs ${plainLen >= 300 && plainLen <= 500 ? 'text-green-600' : 'text-gray-400'}`}>
                  {plainLen}자 (권장 300~500)
                </span>
              </div>
              {/* 서식 툴바 */}
              <div className="flex flex-wrap gap-1 mt-1.5 p-2 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50">
                <button type="button" className={btn + ' font-bold'} onClick={() => exec('bold')} title="굵게">B</button>
                <button type="button" className={btn + ' italic'} onClick={() => exec('italic')} title="기울임">I</button>
                <button type="button" className={btn + ' underline'} onClick={() => exec('underline')} title="밑줄">U</button>
                <span className="w-px bg-gray-300 mx-1" />
                <button type="button" className={btn} onClick={() => exec('formatBlock', 'h3')} title="제목">H</button>
                <button type="button" className={btn} onClick={() => exec('insertUnorderedList')} title="목록">• 목록</button>
                <button type="button" className={btn} onClick={() => exec('formatBlock', 'blockquote')} title="인용">❝</button>
                <span className="w-px bg-gray-300 mx-1" />
                <button type="button" className={btn} onClick={() => { const u = prompt('링크 URL:'); if (u) exec('createLink', u) }} title="링크">🔗</button>
                <button type="button" className={btn} onClick={() => exec('removeFormat')} title="서식 지우기">✕</button>
              </div>
              {/* 편집 영역 (넓고 큼) */}
              <div
                ref={editorRef}
                contentEditable
                onInput={syncContent}
                data-placeholder="핵심 내용을 간결하게 작성하세요. 툴바로 굵게·제목·목록 등 서식을 넣을 수 있습니다."
                className="note-editor w-full min-h-[340px] p-4 border border-gray-300 rounded-b-lg bg-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/30 overflow-auto"
                suppressContentEditableWarning
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">📌 Bottom Line</label>
              <textarea placeholder="이 정보가 매수/전세/투자 판단에 어떤 의미인지 결론을 제시하세요." rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg mt-1.5 resize-none bg-blue-50"
                value={form.bottom_line}
                onChange={e => setForm({ ...form, bottom_line: e.target.value })} />
            </div>

            <button onClick={handleSubmit} disabled={saving || uploading}
              className="w-full p-4 bg-[#1B3A5C] text-white rounded-lg font-semibold text-lg disabled:opacity-50 hover:bg-[#15304d]">
              {saving ? '저장 중...' : '노트 발행하기'}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .note-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        .note-editor h3 { font-size: 1.15rem; font-weight: 700; margin: 0.5rem 0; }
        .note-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .note-editor blockquote { border-left: 3px solid #1B3A5C; padding-left: 0.75rem; color: #555; margin: 0.5rem 0; }
        .note-editor a { color: #1d4ed8; text-decoration: underline; }
      `}</style>
    </div>
  )
}
