'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const LAMBDA_URL = 'https://33bujx6lkx33gqxalne4ufncsy0lchzk.lambda-url.ap-northeast-2.on.aws/'
const PY = 3.3058

interface NvpRef {
  id: string
  ref_code: string
  ticker: string | null
  name: string
  short_name: string | null
  trade_name: string[] | null
  gu: string
  dong: string
  jibun: string | null
  bjdong: string | null
  lawd: string | null
  built_year: number | null
  households: number | null
  belt: string | null
  std_ppp_exclu: number | null
  std_price_m2: number | null
  std_area: number | null
  trade_count: number | null
  latest_date: string | null
  ref_status: string | null
  note: string | null
}

type Trade = { aptNm: string; excluUseAr: string; dealAmount: string; floor: string; cdealType: string; dealYear: string; dealMonth: string; jibun: string; umdNm: string }

async function fetchTrades(lawd: string, months: number): Promise<Trade[]> {
  const now = new Date()
  const jobs: Promise<Trade[]>[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0')
    jobs.push(
      fetch(`${LAMBDA_URL}?LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`)
        .then(r => r.text())
        .then(xml => {
          const doc = new DOMParser().parseFromString(xml, 'text/xml')
          const items: Trade[] = []
          doc.querySelectorAll('item').forEach(el => {
            const o: Record<string, string> = {}
            el.childNodes.forEach(n => { if (n.nodeType === 1) o[n.nodeName] = (n.textContent || '').trim() })
            items.push(o as unknown as Trade)
          })
          return items
        })
        .catch(() => [])
    )
  }
  return (await Promise.all(jobs)).flat()
}

function removeOutliers(vals: number[]): number[] {
  if (vals.length < 4) return vals
  const s = [...vals].sort((a, b) => a - b)
  const q1 = s[Math.floor(s.length * 0.25)], q3 = s[Math.floor(s.length * 0.75)]
  const iqr = q3 - q1
  return vals.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
}

function calcStdPrice(trades: Trade[], row: NvpRef) {
  const kws = (row.trade_name && row.trade_name.length) ? row.trade_name : [row.short_name || row.name]
  let mine = trades.filter(t =>
    (t.umdNm || '').trim() === row.dong &&
    kws.some(k => (t.aptNm || '').includes(k)) &&
    parseInt(t.floor || '0') > 1 && !(t.cdealType && t.cdealType.trim())
  )
  if (!mine.length && row.jibun) {
    mine = trades.filter(t => (t.jibun || '').trim() === row.jibun && parseInt(t.floor || '0') > 1)
  }
  if (!mine.length) return null
  let pool = mine.filter(t => { const a = parseFloat(t.excluUseAr || '0'); return a >= 76 && a <= 90 })
  if (!pool.length) {
    const sorted = [...mine].filter(t => parseFloat(t.excluUseAr || '0') > 0)
      .sort((a, b) => Math.abs(parseFloat(a.excluUseAr) - 84) - Math.abs(parseFloat(b.excluUseAr) - 84))
    if (!sorted.length) return null
    const nearest = parseFloat(sorted[0].excluUseAr)
    pool = mine.filter(t => Math.abs(parseFloat(t.excluUseAr || '0') - nearest) < 3)
  }
  let ppps = pool.map(t => {
    const amt = parseInt((t.dealAmount || '0').replace(/,/g, '')), ar = parseFloat(t.excluUseAr || '0')
    return ar > 0 ? amt / (ar / PY) : 0
  }).filter(v => v > 0)
  let perM2 = pool.map(t => {
    const amt = parseInt((t.dealAmount || '0').replace(/,/g, '')), ar = parseFloat(t.excluUseAr || '0')
    return ar > 0 ? amt / ar : 0
  }).filter(v => v > 0)
  ppps = removeOutliers(ppps); perM2 = removeOutliers(perM2)
  if (!ppps.length) return null
  const avgPy = Math.round(ppps.reduce((a, b) => a + b, 0) / ppps.length)
  const avgM2 = Math.round(perM2.reduce((a, b) => a + b, 0) / perM2.length)
  const dates = pool.map(t => `${t.dealYear}.${String(t.dealMonth).padStart(2, '0')}`).sort()
  const areaAvg = pool.reduce((s, t) => s + parseFloat(t.excluUseAr || '0'), 0) / pool.length
  return { ppp: avgPy, m2: avgM2, count: pool.length, latest: dates[dates.length - 1], area: Math.round(areaAvg * 100) / 100 }
}

// 컬럼 정의 (리사이즈 가능)
const COLS: { key: string; label: string; w: number; hi?: boolean }[] = [
  { key: 'ref_code', label: 'refCode', w: 130 },
  { key: 'ticker', label: '티커', w: 70 },
  { key: 'short_name', label: '약칭', w: 90 },
  { key: 'name', label: '단지명', w: 160 },
  { key: 'gu', label: '구', w: 60 },
  { key: 'dong', label: '동', w: 70 },
  { key: 'jibun', label: '지번', w: 60 },
  { key: 'built_year', label: '준공', w: 55 },
  { key: 'households', label: '세대', w: 60 },
  { key: 'trade_name', label: '실거래명', w: 150 },
  { key: 'std_ppp_exclu', label: '전용평당가', w: 85, hi: true },
  { key: 'std_price_m2', label: '㎡당가', w: 75, hi: true },
  { key: 'trade_count', label: '건수', w: 45 },
  { key: 'latest_date', label: '최근', w: 60 },
  { key: 'ref_status', label: '상태', w: 60 },
  { key: 'action', label: '작업', w: 130 },
]

export default function NvpAdminPage() {
  const [rows, setRows] = useState<NvpRef[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [fontPx, setFontPx] = useState(12)
  const [widths, setWidths] = useState<Record<string, number>>(() => Object.fromEntries(COLS.map(c => [c.key, c.w])))

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('nvp_reference').select('*').order('gu').order('dong').order('built_year', { ascending: false })
    if (error) setMsg('조회 오류: ' + error.message)
    if (data) setRows(data as NvpRef[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  async function saveField(id: string, field: string, value: unknown) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    const { error } = await supabase.from('nvp_reference').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setMsg(`저장 실패(${field}): ` + error.message)
  }

  async function refreshOne(row: NvpRef) {
    if (!row.lawd) { setMsg(`${row.short_name || row.name}: 시군구코드(lawd) 없음`); return }
    setBusy(row.id); setMsg('')
    try {
      const trades = await fetchTrades(row.lawd, 12)
      const r = calcStdPrice(trades, row)
      if (!r) {
        await supabase.from('nvp_reference').update({ ref_status: 'pending', price_updated: new Date().toISOString() }).eq('id', row.id)
        setMsg(`${row.short_name || row.name}: 최근 12개월 84㎡ 거래 없음 (pending)`)
      } else {
        await supabase.from('nvp_reference').update({
          std_ppp_exclu: r.ppp, std_price_m2: r.m2, std_area: r.area,
          trade_count: r.count, latest_date: r.latest,
          price_updated: new Date().toISOString(), ref_status: 'active',
        }).eq('id', row.id)
        setMsg(`${row.short_name || row.name}: ${r.ppp.toLocaleString()}만원/평 (${r.count}건, ${r.latest})`)
      }
      await fetchRows()
    } catch (e: unknown) {
      setMsg('조회 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setBusy(null) }
  }

  async function refreshAll() {
    if (!confirm(`${rows.length}개 단지 실거래를 모두 조회합니다. 진행할까요?`)) return
    for (const row of rows) await refreshOne(row)
    setMsg('전체 갱신 완료')
  }

  async function addRow() {
    const ref_code = prompt('새 단지 refCode (예: NVP-GN-XXX-001):')
    if (!ref_code) return
    const name = prompt('단지명:') || '(신규)'
    const { error } = await supabase.from('nvp_reference').insert({ ref_code, name, gu: '강남구', dong: '', ref_status: 'pending' })
    if (error) setMsg('추가 실패: ' + error.message)
    else fetchRows()
  }

  async function delRow(row: NvpRef) {
    if (!confirm(`"${row.name}" 삭제하시겠습니까?`)) return
    setBusy(row.id)
    const { error } = await supabase.from('nvp_reference').delete().eq('id', row.id)
    setBusy(null)
    if (error) { setMsg('삭제 실패: ' + error.message); return }
    setRows(prev => prev.filter(r => r.id !== row.id))
    setMsg(`${row.name} 삭제됨`)
  }

  // 컬럼 리사이즈 (드래그)
  function startResize(key: string, e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = widths[key]
    const onMove = (ev: MouseEvent) => {
      const nw = Math.max(40, startW + (ev.clientX - startX))
      setWidths(prev => ({ ...prev, [key]: nw }))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  const th = 'relative border border-gray-200 px-2 py-1 font-semibold text-gray-700 bg-gray-100 text-left select-none'
  const td = 'border border-gray-200 px-1.5 py-0.5 align-middle'
  const inp = 'w-full bg-transparent focus:bg-yellow-50 focus:outline-none px-1 rounded'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A5C] text-white px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-semibold">🏙 NVP 레퍼런스 관리</h1>
          <p className="text-xs opacity-80">신축 벤치마크 · 실거래 84㎡ 기준 표준가</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* 폰트 크기 조절 */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
            <span className="text-xs opacity-70">글자</span>
            <button onClick={() => setFontPx(f => Math.max(9, f - 1))} className="w-6 h-6 rounded bg-white/20 hover:bg-white/30 text-sm">－</button>
            <span className="text-xs w-6 text-center">{fontPx}</span>
            <button onClick={() => setFontPx(f => Math.min(18, f + 1))} className="w-6 h-6 rounded bg-white/20 hover:bg-white/30 text-sm">＋</button>
          </div>
          <button onClick={addRow} className="text-sm px-3 py-1.5 rounded-lg border border-blue-300 text-blue-100 hover:bg-white/10">+ 단지 추가</button>
          <button onClick={refreshAll} disabled={!!busy} className="text-sm px-3 py-1.5 rounded-lg bg-white text-[#1B3A5C] font-semibold disabled:opacity-50">전체 갱신</button>
          <a href="/admin" className="text-xs text-blue-200 underline">← 대시보드</a>
        </div>
      </header>

      {msg && <div className="bg-blue-50 text-[#1B3A5C] text-sm px-6 py-2 border-b border-blue-100">{msg}</div>}

      <div className="p-3">
        <p className="text-xs text-gray-500 mb-2">셀 클릭해 수정 · 헤더 경계 드래그로 너비 조절 · [실거래 조회]로 표준가 산출 · 총 {rows.length}개</p>
        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
          <table className="border-collapse" style={{ fontSize: fontPx, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {COLS.map(c => (
                  <th key={c.key} className={th + (c.hi ? ' !bg-amber-100' : '')} style={{ width: widths[c.key], minWidth: widths[c.key] }}>
                    {c.label}
                    <span onMouseDown={e => startResize(c.key, e)}
                      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={r.ref_status === 'active' ? 'hover:bg-blue-50/30' : 'bg-gray-50/40 hover:bg-blue-50/30'}>
                  <td className={td + ' font-mono text-[0.85em] whitespace-nowrap text-gray-500'} style={{ width: widths.ref_code }}>{r.ref_code}</td>
                  <td className={td} style={{ width: widths.ticker }}><input className={inp} defaultValue={r.ticker || ''} onBlur={e => saveField(r.id, 'ticker', e.target.value)} /></td>
                  <td className={td} style={{ width: widths.short_name }}><input className={inp} defaultValue={r.short_name || ''} onBlur={e => saveField(r.id, 'short_name', e.target.value)} /></td>
                  <td className={td} style={{ width: widths.name }}><input className={inp} defaultValue={r.name} onBlur={e => saveField(r.id, 'name', e.target.value)} /></td>
                  <td className={td} style={{ width: widths.gu }}><input className={inp} defaultValue={r.gu} onBlur={e => saveField(r.id, 'gu', e.target.value)} /></td>
                  <td className={td} style={{ width: widths.dong }}><input className={inp} defaultValue={r.dong} onBlur={e => saveField(r.id, 'dong', e.target.value)} /></td>
                  <td className={td} style={{ width: widths.jibun }}><input className={inp} defaultValue={r.jibun || ''} onBlur={e => saveField(r.id, 'jibun', e.target.value)} /></td>
                  <td className={td} style={{ width: widths.built_year }}><input className={inp} defaultValue={r.built_year ?? ''} onBlur={e => saveField(r.id, 'built_year', e.target.value ? Number(e.target.value) : null)} /></td>
                  <td className={td} style={{ width: widths.households }}><input className={inp} defaultValue={r.households ?? ''} onBlur={e => saveField(r.id, 'households', e.target.value ? Number(e.target.value) : null)} /></td>
                  <td className={td} style={{ width: widths.trade_name }}><input className={inp} defaultValue={(r.trade_name || []).join(', ')} onBlur={e => saveField(r.id, 'trade_name', e.target.value ? e.target.value.split(',').map(s => s.trim()) : null)} /></td>
                  <td className={td + ' text-right font-semibold text-[#1B3A5C]'} style={{ width: widths.std_ppp_exclu }}>{r.std_ppp_exclu ? r.std_ppp_exclu.toLocaleString() : '—'}</td>
                  <td className={td + ' text-right'} style={{ width: widths.std_price_m2 }}>{r.std_price_m2 ? r.std_price_m2.toLocaleString() : '—'}</td>
                  <td className={td + ' text-center text-gray-500'} style={{ width: widths.trade_count }}>{r.trade_count ?? '—'}</td>
                  <td className={td + ' text-center text-gray-500'} style={{ width: widths.latest_date }}>{r.latest_date || '—'}</td>
                  <td className={td + ' text-center'} style={{ width: widths.ref_status }}>
                    <span className={`px-1.5 py-0.5 rounded text-[0.85em] ${r.ref_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{r.ref_status}</span>
                  </td>
                  <td className={td + ' whitespace-nowrap text-center'} style={{ width: widths.action }}>
                    <button onClick={() => refreshOne(r)} disabled={busy === r.id}
                      className="px-2 py-0.5 bg-[#1B3A5C] text-white rounded text-[0.9em] disabled:opacity-50">
                      {busy === r.id ? '...' : '조회'}
                    </button>
                    <button onClick={() => delRow(r)} disabled={busy === r.id}
                      className="px-2 py-0.5 text-red-500 text-[0.9em] ml-1 hover:bg-red-50 rounded disabled:opacity-50">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
