'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// recon_docs 관리 페이지 — 단지별 문서(정비계획·조합공지·시공사자료·분석노트) CRUD.
// 마스터 관리(/admin/recon)와 동일 방식: authenticated 세션으로 직접 조회·저장·삭제.
// 문서 → 숫자추출·검수 → recon_master 확정컬럼 반영 파이프라인의 "원천 문서" 저장소.

interface Doc {
  id?: string
  asset_id: string | null
  ticker: string | null
  doc_type: string | null
  title: string
  body: string | null
  source: string | null
  doc_date: string | null
  created_at?: string
  updated_at?: string
}

interface MasterLite {
  asset_id: string
  ticker: string | null
  short_name: string | null
  name: string | null
  gu: string | null
  dong: string | null
}

const DOC_TYPES = ['정비계획', '조합공지', '시공사자료', '분석노트', '기타']

const emptyDoc = (): Doc => ({
  asset_id: null, ticker: null, doc_type: '정비계획',
  title: '', body: '', source: '', doc_date: String(new Date().getFullYear()),
})

// 아주 가벼운 마크다운 → HTML (## 제목, - 목록, **강조**, 줄바꿈). 미리보기용.
function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lines = (md || '').split('\n')
  const out: string[] = []
  let inList = false
  const inline = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, '<code style="background:#2a2a2a;padding:1px 4px;border-radius:3px">$1</code>')
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (/^###\s+/.test(line)) { if (inList) { out.push('</ul>'); inList = false } out.push(`<h4 style="margin:10px 0 4px;color:#C79A5B">${inline(line.replace(/^###\s+/, ''))}</h4>`) }
    else if (/^##\s+/.test(line)) { if (inList) { out.push('</ul>'); inList = false } out.push(`<h3 style="margin:12px 0 5px;color:#C79A5B;border-bottom:1px solid #333;padding-bottom:3px">${inline(line.replace(/^##\s+/, ''))}</h3>`) }
    else if (/^-\s+/.test(line)) { if (!inList) { out.push('<ul style="margin:4px 0;padding-left:20px">'); inList = true } out.push(`<li style="margin:2px 0">${inline(line.replace(/^-\s+/, ''))}</li>`) }
    else if (line.trim() === '') { if (inList) { out.push('</ul>'); inList = false } }
    else { if (inList) { out.push('</ul>'); inList = false } out.push(`<p style="margin:4px 0">${inline(line)}</p>`) }
  }
  if (inList) out.push('</ul>')
  return out.join('')
}

export default function AdminDocsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [masters, setMasters] = useState<MasterLite[]>([])
  const [selId, setSelId] = useState<string | null>(null)   // 선택된 문서 id (null=신규)
  const [draft, setDraft] = useState<Doc>(emptyDoc())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(true)
  const [filterAsset, setFilterAsset] = useState('')  // 목록 단지 필터

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: d, error: de }, { data: m }] = await Promise.all([
      supabase.from('recon_docs').select('*').order('updated_at', { ascending: false }),
      supabase.from('recon_master').select('asset_id,ticker,short_name,name,gu,dong').eq('status', 'active').order('gu').order('dong'),
    ])
    if (de) setMsg('조회 오류: ' + de.message)
    setDocs((d as Doc[]) || [])
    setMasters((m as MasterLite[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const masterByAsset = useMemo(() => {
    const map: Record<string, MasterLite> = {}
    masters.forEach(m => { map[m.asset_id] = m })
    return map
  }, [masters])

  const selectDoc = (doc: Doc | null) => {
    setMsg('')
    if (!doc) { setSelId(null); setDraft(emptyDoc()); return }
    setSelId(doc.id || null)
    setDraft({ ...doc })
  }

  const onPickAsset = (assetId: string) => {
    const m = masterByAsset[assetId]
    setDraft(d => ({ ...d, asset_id: assetId || null, ticker: m?.ticker ?? d.ticker }))
  }

  const save = async () => {
    if (!draft.title.trim()) { setMsg('제목을 입력하세요.'); return }
    setSaving(true); setMsg('')
    const payload = {
      asset_id: draft.asset_id, ticker: draft.ticker, doc_type: draft.doc_type,
      title: draft.title.trim(), body: draft.body, source: draft.source, doc_date: draft.doc_date,
      updated_at: new Date().toISOString(),
    }
    let error
    if (selId) {
      ({ error } = await supabase.from('recon_docs').update(payload).eq('id', selId))
    } else {
      ({ error } = await supabase.from('recon_docs').insert(payload))
    }
    setSaving(false)
    if (error) { setMsg('저장 실패: ' + error.message); return }
    setMsg('저장됨 ✓')
    await load()
    if (!selId) selectDoc(null)
  }

  const del = async () => {
    if (!selId) return
    if (!confirm('이 문서를 삭제할까요? 되돌릴 수 없습니다.')) return
    setSaving(true)
    const { error } = await supabase.from('recon_docs').delete().eq('id', selId)
    setSaving(false)
    if (error) { setMsg('삭제 실패: ' + error.message); return }
    setMsg('삭제됨')
    selectDoc(null)
    await load()
  }

  const shown = filterAsset ? docs.filter(d => d.asset_id === filterAsset) : docs
  const label = (d: Doc) => {
    const m = d.asset_id ? masterByAsset[d.asset_id] : null
    return m ? (m.short_name || m.name || d.asset_id) : (d.ticker || d.asset_id || '—')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111', color: '#eee', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
      {/* 좌측: 문서 목록 */}
      <div style={{ width: 340, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>📄 정비계획·문서 관리</h2>
            <button onClick={() => selectDoc(null)} style={btnPrimary}>+ 새 문서</button>
          </div>
          <div style={{ marginTop: 10 }}>
            <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)} style={{ ...input, width: '100%' }}>
              <option value="">전체 단지 ({docs.length}건)</option>
              {masters.map(m => (
                <option key={m.asset_id} value={m.asset_id}>{m.short_name || m.name} ({m.ticker})</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 16, color: '#888' }}>불러오는 중…</div>}
          {!loading && shown.length === 0 && <div style={{ padding: 16, color: '#888' }}>문서 없음. "+ 새 문서"로 작성하세요.</div>}
          {shown.map(d => (
            <div key={d.id} onClick={() => selectDoc(d)}
              style={{
                padding: '10px 16px', borderBottom: '1px solid #222', cursor: 'pointer',
                background: selId === d.id ? '#1e2a1e' : 'transparent',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>{label(d)}</span>
                <span style={{ fontSize: 11, color: '#C79A5B', whiteSpace: 'nowrap' }}>{d.doc_type}</span>
              </div>
              <div style={{ fontSize: 13, color: '#ccc', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{d.doc_date || ''} · {d.ticker || ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 우측: 편집/조회 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #333', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={draft.asset_id || ''} onChange={e => onPickAsset(e.target.value)} style={{ ...input, minWidth: 200 }}>
            <option value="">단지 선택(없음)</option>
            {masters.map(m => (
              <option key={m.asset_id} value={m.asset_id}>{m.gu} {m.short_name || m.name} ({m.ticker})</option>
            ))}
          </select>
          <select value={draft.doc_type || ''} onChange={e => setDraft(d => ({ ...d, doc_type: e.target.value }))} style={input}>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={draft.doc_date || ''} onChange={e => setDraft(d => ({ ...d, doc_date: e.target.value }))} placeholder="일자(예:2026)" style={{ ...input, width: 100 }} />
          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? '저장 중…' : (selId ? '저장' : '작성')}</button>
          {selId && <button onClick={del} disabled={saving} style={btnDanger}>삭제</button>}
        </div>

        <div style={{ padding: '10px 20px', borderBottom: '1px solid #222' }}>
          <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="문서 제목 (예: 오금현대아파트 재건축 종합 정리)"
            style={{ ...input, width: '100%', fontSize: 16, fontWeight: 700 }} />
          <input value={draft.source || ''} onChange={e => setDraft(d => ({ ...d, source: e.target.value }))} placeholder="출처(고시번호·URL 등)"
            style={{ ...input, width: '100%', marginTop: 8, fontSize: 12 }} />
        </div>

        {/* 본문: 편집 + 미리보기 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', color: '#888', fontSize: 12 }}>
          <span>본문 (마크다운: ## 제목, - 목록, **강조**)</span>
          <label style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={preview} onChange={e => setPreview(e.target.checked)} /> 미리보기
          </label>
          {msg && <span style={{ marginLeft: 'auto', color: msg.includes('실패') || msg.includes('오류') ? '#e57373' : '#81c784' }}>{msg}</span>}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 12, padding: '0 20px 20px', overflow: 'hidden' }}>
          <textarea value={draft.body || ''} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
            placeholder="문서 본문을 붙여넣으세요…"
            style={{ flex: 1, background: '#1a1a1a', color: '#eee', border: '1px solid #333', borderRadius: 6, padding: 12, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, resize: 'none' }} />
          {preview && (
            <div style={{ flex: 1, background: '#161616', border: '1px solid #333', borderRadius: 6, padding: '4px 16px', overflowY: 'auto', fontSize: 13, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: mdToHtml(draft.body || '') || '<p style="color:#666">미리보기…</p>' }} />
          )}
        </div>
      </div>
    </div>
  )
}

const input: React.CSSProperties = { background: '#1a1a1a', color: '#eee', border: '1px solid #333', borderRadius: 5, padding: '7px 10px', fontSize: 13 }
const btnPrimary: React.CSSProperties = { background: '#2E7D32', color: '#fff', border: 'none', borderRadius: 5, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { background: '#5a2020', color: '#f0c0c0', border: '1px solid #7a3030', borderRadius: 5, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }
