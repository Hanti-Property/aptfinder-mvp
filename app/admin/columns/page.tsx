'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { sanitizeHtml, stripHtml } from '@/lib/noteHtml'

const SERIES_LIST = [
  '강남 재건축 투자 가이드',
  '강남 아파트 세무 전략',
  '대치동 학군 리포트',
  '강남아파트 시장 전망',
  '강남 아파트 단지별 리포트',
]
const AUTHORS = ['홍성욱', 'aptFinder 리서치팀']
const FIELDS = ['공인중개사', '세무사', '법무사', '대출전문가', '감정평가사', '재건축전문가']

const btnCls = 'px-2.5 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 active:bg-gray-200 min-w-[34px]'
type ToolKey = 'bold' | 'italic' | 'underline' | 'h3' | 'ul' | 'quote' | 'link' | 'clear'

/** 재사용 서식 에디터 (노트 에디터와 동일) */
function RichEditor({
  value, onChange, placeholder, minHeight = 200, tools, bg = 'bg-white',
}: {
  value: string; onChange: (html: string) => void; placeholder: string
  minHeight?: number; tools: ToolKey[]; bg?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current && value === '' && ref.current.innerHTML !== '') ref.current.innerHTML = ''
  }, [value])

  function exec(cmd: string, val?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    onChange(ref.current?.innerHTML || '')
  }
  const label: Record<ToolKey, { t: string; cls?: string; title: string }> = {
    bold: { t: 'B', cls: 'font-bold', title: '굵게' }, italic: { t: 'I', cls: 'italic', title: '기울임' },
    underline: { t: 'U', cls: 'underline', title: '밑줄' }, h3: { t: 'H', title: '제목' },
    ul: { t: '• 목록', title: '목록' }, quote: { t: '❝', title: '인용' },
    link: { t: '🔗', title: '링크' }, clear: { t: '✕', title: '서식 지우기' },
  }
  function onTool(k: ToolKey, e: React.MouseEvent) {
    e.preventDefault()
    switch (k) {
      case 'bold': return exec('bold'); case 'italic': return exec('italic')
      case 'underline': return exec('underline'); case 'h3': return exec('formatBlock', 'h3')
      case 'ul': return exec('insertUnorderedList'); case 'quote': return exec('formatBlock', 'blockquote')
      case 'link': { const u = prompt('링크 URL:'); if (u) exec('createLink', u); return }
      case 'clear': return exec('removeFormat')
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1 mt-1.5 p-2 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50">
        {tools.map(k => (
          <button key={k} type="button" title={label[k].title}
            className={`${btnCls} ${label[k].cls || ''}`} onMouseDown={e => onTool(k, e)}>
            {label[k].t}
          </button>
        ))}
      </div>
      <div ref={ref} contentEditable onInput={e => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder} style={{ minHeight }}
        className={`note-editor w-full p-4 border border-gray-300 rounded-b-lg ${bg} leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/30 overflow-auto`}
        suppressContentEditableWarning />
    </div>
  )
}

export default function ColumnWritePage() {
  const [form, setForm] = useState({ series: '', title: '', author: '홍성욱', author_field: '공인중개사' })
  const [contentHtml, setContentHtml] = useState('')
  const [bottomHtml, setBottomHtml] = useState('')
  const [thumbUrl, setThumbUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const plainLen = stripHtml(contentHtml).length

  async function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('이미지는 5MB 이하만 가능합니다.'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `expert-columns/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('listing-images').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
      setThumbUrl(data.publicUrl)
    } catch (err: unknown) {
      alert('이미지 업로드 실패: ' + (err instanceof Error ? err.message : String(err)))
    } finally { setUploading(false) }
  }

  async function handleSubmit() {
    if (!form.series || !form.title || !stripHtml(contentHtml)) {
      alert('시리즈, 제목, 본문은 필수입니다.')
      return
    }
    setSaving(true)
    const base = {
      series: form.series, title: form.title,
      content: contentHtml, bottom_line: bottomHtml,
      author: form.author, author_field: form.author_field,
    }
    // thumbnail 컬럼 없으면 폴백. episode 컬럼이 NOT NULL이면 기본값 1 포함해 재시도.
    let { error } = await supabase.from('expert_columns').insert({ ...base, thumbnail: thumbUrl || null })
    if (error && /thumbnail/.test(error.message)) {
      ;({ error } = await supabase.from('expert_columns').insert(base))
    }
    if (error && /episode/.test(error.message)) {
      ;({ error } = await supabase.from('expert_columns').insert({ ...base, episode: 1, thumbnail: thumbUrl || null }))
      if (error && /thumbnail/.test(error.message)) {
        ;({ error } = await supabase.from('expert_columns').insert({ ...base, episode: 1 }))
      }
    }
    setSaving(false)
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      alert('✅ 전문가 칼럼이 발행되었습니다!')
      const next = confirm('계속 작성하시겠습니까?\n\n[확인] → 새 칼럼 작성\n[취소] → 칼럼 목록으로 이동')
      if (next) {
        setForm({ ...form, title: '' })
        setContentHtml(''); setBottomHtml(''); setThumbUrl(''); setPreview(false)
        window.scrollTo(0, 0)
      } else {
        window.location.href = '/columns'
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A5C] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">전문가 칼럼 작성</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setPreview(p => !p)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${preview ? 'bg-white text-[#1B3A5C] border-white' : 'border-blue-300 text-blue-100 hover:bg-white/10'}`}>
            {preview ? '✏️ 편집으로' : '👁 미리보기'}
          </button>
          <a href="/admin/columns/list" className="text-xs text-blue-200 underline">칼럼 목록 →</a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {preview ? (
          /* ===== 미리보기 (공개 페이지와 동일 sanitize·CSS) ===== */
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-xs text-gray-400 mb-3">👁 발행 후 이렇게 보입니다</p>
            <div className="mb-2">
              <span className="text-[11px] text-white px-2 py-0.5 rounded bg-[#1B3A5C]">{form.series || '시리즈 미선택'}</span>
            </div>
            <h1 className="text-xl font-bold mb-2 text-gray-900">{form.title || '(제목 없음)'}</h1>
            <p className="text-xs text-gray-500 mb-4">{form.author} · {form.author_field}</p>
            {thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt="썸네일" className="w-full rounded-lg mb-4 object-cover max-h-72" />
            )}
            {stripHtml(contentHtml) ? (
              <div className="note-content text-[15px] leading-relaxed text-gray-700"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }} />
            ) : <p className="text-gray-400 text-sm">본문을 입력하세요.</p>}
            {stripHtml(bottomHtml) && (
              <div className="bg-amber-50 border-l-4 border-[#C49A3C] p-3 rounded-r-lg mt-4">
                <p className="text-sm text-[#C49A3C] font-semibold">📌 Bottom Line</p>
                <div className="note-content text-sm mt-1 text-gray-700"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(bottomHtml) }} />
              </div>
            )}
            <button onClick={handleSubmit} disabled={saving || uploading}
              className="w-full mt-6 p-4 bg-[#1B3A5C] text-white rounded-lg font-semibold text-lg disabled:opacity-50 hover:bg-[#15304d]">
              {saving ? '저장 중...' : '이대로 발행하기'}
            </button>
          </div>
        ) : (
          /* ===== 편집 ===== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측: 메타 */}
            <div className="lg:col-span-1 space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">시리즈 *</label>
                <select className="w-full p-3 border border-gray-300 rounded-lg mt-1.5 bg-white"
                  value={form.series} onChange={e => setForm({ ...form, series: e.target.value })}>
                  <option value="">-- 시리즈 선택 --</option>
                  {SERIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">제목 *</label>
                <input type="text" placeholder="예) 은마아파트 재건축, 지금이 진입 타이밍인가?"
                  className="w-full p-3 border border-gray-300 rounded-lg mt-1.5"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">작성자</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg mt-1.5 bg-white"
                    value={form.author} onChange={e => setForm({ ...form, author: e.target.value })}>
                    {AUTHORS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">전문분야</label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg mt-1.5 bg-white"
                    value={form.author_field} onChange={e => setForm({ ...form, author_field: e.target.value })}>
                    {FIELDS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">썸네일 이미지</label>
                <div className="mt-1.5 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white">
                  {thumbUrl ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl} alt="썸네일" className="w-full h-40 object-cover rounded-lg" />
                      <button onClick={() => setThumbUrl('')} className="text-xs text-red-500 underline">이미지 제거</button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full py-8 text-gray-400 hover:text-gray-600 whitespace-pre-line">
                      {uploading ? '업로드 중...' : '📷 클릭하여 이미지 업로드\n(최대 5MB)'}
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleThumb} />
                </div>
              </div>
            </div>

            {/* 우측: 본문 + Bottom Line */}
            <div className="lg:col-span-2 space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">본문 *</label>
                  <span className="text-xs text-gray-400">{plainLen}자</span>
                </div>
                <RichEditor value={contentHtml} onChange={setContentHtml} minHeight={360}
                  placeholder="분석 내용을 작성하세요. 리서치 노트보다 깊이 있는 내용을 담아주세요."
                  tools={['bold', 'italic', 'underline', 'h3', 'ul', 'quote', 'link', 'clear']} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">📌 Bottom Line</label>
                <RichEditor value={bottomHtml} onChange={setBottomHtml} minHeight={130} bg="bg-blue-50"
                  placeholder="이 칼럼의 핵심 결론과 독자가 취해야 할 행동을 정리하세요."
                  tools={['bold', 'underline', 'ul', 'link', 'clear']} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPreview(true)}
                  className="flex-1 p-4 bg-white border border-[#1B3A5C] text-[#1B3A5C] rounded-lg font-semibold hover:bg-gray-50">
                  👁 미리보기
                </button>
                <button onClick={handleSubmit} disabled={saving || uploading}
                  className="flex-1 p-4 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-[#15304d]">
                  {saving ? '저장 중...' : '칼럼 발행하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .note-editor:empty:before { content: attr(data-placeholder); color: #9ca3af; }
        .note-editor h3, .note-content h3 { font-size: 1.1rem; font-weight: 700; margin: 0.6rem 0 0.3rem; color: #111827; }
        .note-editor ul, .note-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .note-editor ol, .note-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .note-editor blockquote, .note-content blockquote { border-left: 3px solid #1B3A5C; padding-left: 0.75rem; color: #555; margin: 0.5rem 0; }
        .note-editor a, .note-content a { color: #1d4ed8; text-decoration: underline; }
        .note-content p { margin: 0.5rem 0; }
      `}</style>
    </div>
  )
}
