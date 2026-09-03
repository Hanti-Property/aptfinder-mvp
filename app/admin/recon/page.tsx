'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const LAMBDA_URL = 'https://33bujx6lkx33gqxalne4ufncsy0lchzk.lambda-url.ap-northeast-2.on.aws/'
const PY = 3.3058

interface Recon { id: string; [k: string]: unknown }

const STAGE_NAME: Record<number, string> = { 3: '추진위', 4: '조합설립', 5: '사업시행', 6: '관리처분', 7: '이주/철거', 8: '착공', 9: '입주' }

// 보기 그룹별 컬럼
//  edit: 편집 / ro: 읽기전용 / m2: 평당가→㎡당가 변환 표시 / calc: 파생계산(row→값)
type Col = {
  key: string; label: string; w: number
  edit?: boolean; num?: boolean; bool?: boolean; arr?: boolean; ro?: boolean
  m2?: boolean                       // 값을 ÷3.3058 하여 ㎡당가로 표시
  calc?: (r: Recon) => number | null // 파생 계산 컬럼
}
const GROUPS: Record<string, Col[]> = {
  기본: [
    { key: 'asset_id', label: '자산코드', w: 145, ro: true },
    { key: 'ticker', label: '티커', w: 70, edit: true },
    { key: 'short_name', label: '약칭', w: 90, edit: true },
    { key: 'name', label: '단지명', w: 150, edit: true },
    { key: 'dong', label: '동', w: 70, edit: true },
    { key: 'jibun', label: '지번', w: 60, edit: true },
    { key: 'households', label: '세대', w: 60, edit: true, num: true },
    { key: 'far', label: '현용적률', w: 70, edit: true, num: true },
    { key: 'plat_area', label: '대지면적㎡', w: 90, edit: true, num: true },
    { key: 'trade_name', label: '실거래명', w: 130, edit: true, arr: true },
  ],
  운영: [
    { key: 'stage', label: '단계', w: 60, edit: true, num: true },
    { key: 'builder', label: '시공사', w: 130, edit: true },
    { key: 'eta', label: 'ETA', w: 55, edit: true, num: true },
    { key: 'rdt', label: '리스크시간', w: 70, edit: true, num: true },
    { key: 'move_in', label: '입주년', w: 60, edit: true, num: true },
    { key: 'target_far', label: '목표용적률', w: 80, edit: true, num: true },
    { key: 'eta_provisional', label: '잠정ETA', w: 60, edit: true, bool: true },
    { key: 'risk', label: '리스크/비고', w: 220, edit: true },
  ],
  // 평당가: 토지(대지) vs 건축(전용) 구분 + 각각 만원/평 · 만원/㎡ 나란히
  평당가: [
    { key: 'land_ppp_market', label: '[토지]현재 만원/평', w: 120, ro: true },
    { key: 'land_ppp_market', label: '[토지]현재 만원/㎡', w: 120, ro: true, m2: true },
    { key: '_land_ppp_new', label: '[토지]재건축후 만원/평', w: 130, ro: true, calc: r => (r.land_ppp_market && r.rar) ? Math.round(Number(r.land_ppp_market) * Number(r.rar)) : null },
    { key: '_land_ppp_new_m2', label: '[토지]재건축후 만원/㎡', w: 130, ro: true, calc: r => (r.land_ppp_market && r.rar) ? Math.round(Number(r.land_ppp_market) * Number(r.rar) / PY) : null },
    { key: 'avg_ppp', label: '[전용]현재 만원/평', w: 120, ro: true },
    { key: 'avg_ppp', label: '[전용]현재 만원/㎡', w: 120, ro: true, m2: true },
    { key: 'ncmc_new_ppp', label: '[전용]재건축후 만원/평', w: 130, ro: true },
    { key: 'ncmc_new_ppp', label: '[전용]재건축후 만원/㎡', w: 130, ro: true, m2: true },
  ],
  인덱스: [
    { key: 'cmc', label: 'CMC(조)', w: 75, ro: true },
    { key: 'cap_grade', label: '등급', w: 75, ro: true },
    { key: 'ncmc', label: 'NCMC(조)', w: 80, ro: true },
    { key: 'rar', label: 'RAR', w: 60, ro: true },
    { key: 'ncmc_nvp_base', label: 'NVP기준가', w: 80, ro: true },
    { key: 'nvp_gap_rate', label: 'NVP괴리%', w: 75, ro: true },
    { key: 'target_far', label: '목표용적률', w: 75, ro: true },
    { key: 'size_grade', label: '규모', w: 50, ro: true },
    { key: 'trade_reliability', label: '거래신뢰', w: 70, ro: true },
    { key: 'warn_distortion', label: '왜곡주의', w: 65, ro: true },
  ],
  실거래: [
    { key: 'latest_price', label: '최근실거래', w: 90, ro: true },
    { key: 'latest_date', label: '거래월', w: 65, ro: true },
    { key: 'latest_exclu_py', label: '전용평', w: 60, ro: true },
    { key: 'trade_count', label: '건수', w: 50, ro: true },
    { key: 'avg_ppp', label: '[전용]평균 만원/평', w: 120, ro: true },
    { key: 'price_updated', label: '갱신일', w: 90, ro: true },
  ],
}

type Trade = { aptNm: string; excluUseAr: string; dealAmount: string; floor: string; cdealType: string; dealYear: string; dealMonth: string; jibun: string; umdNm: string }
async function fetchTrades(lawd: string, months: number): Promise<Trade[]> {
  const now = new Date(); const jobs: Promise<Trade[]>[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0')
    jobs.push(fetch(`${LAMBDA_URL}?LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`).then(r => r.text()).then(xml => {
      const doc = new DOMParser().parseFromString(xml, 'text/xml'); const items: Trade[] = []
      doc.querySelectorAll('item').forEach(el => { const o: Record<string, string> = {}; el.childNodes.forEach(n => { if (n.nodeType === 1) o[n.nodeName] = (n.textContent || '').trim() }); items.push(o as unknown as Trade) })
      return items
    }).catch(() => []))
  }
  return (await Promise.all(jobs)).flat()
}
function removeOutliers(v: number[]): number[] { if (v.length < 4) return v; const s = [...v].sort((a, b) => a - b); const q1 = s[Math.floor(s.length * .25)], q3 = s[Math.floor(s.length * .75)], iqr = q3 - q1; return v.filter(x => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr) }

/** 재건축 단지 현재가 실거래 갱신 (전용면적 기준 평균, 84 우선 아님 — 전체 대표) */
function calcCurrent(trades: Trade[], row: Recon) {
  const kws = (row.trade_name as string[] | null) || [row.short_name as string || row.name as string]
  const dong = row.dong as string, jibun = row.jibun as string
  let mine = trades.filter(t => (t.umdNm || '').trim() === dong && kws.some(k => (t.aptNm || '').includes(k)) && parseInt(t.floor || '0') > 1 && !(t.cdealType && t.cdealType.trim()))
  if (!mine.length && jibun) mine = trades.filter(t => (t.jibun || '').trim() === jibun && parseInt(t.floor || '0') > 1)
  if (!mine.length) return null
  // 84 우선(76~90), 없으면 84 최근접
  let pool = mine.filter(t => { const a = parseFloat(t.excluUseAr || '0'); return a >= 76 && a <= 90 })
  if (!pool.length) { const s = [...mine].filter(t => parseFloat(t.excluUseAr || '0') > 0).sort((a, b) => Math.abs(parseFloat(a.excluUseAr) - 84) - Math.abs(parseFloat(b.excluUseAr) - 84)); if (!s.length) return null; const near = parseFloat(s[0].excluUseAr); pool = mine.filter(t => Math.abs(parseFloat(t.excluUseAr || '0') - near) < 3) }
  let ppps = pool.map(t => { const a = parseInt((t.dealAmount || '0').replace(/,/g, '')), ar = parseFloat(t.excluUseAr || '0'); return ar > 0 ? a / (ar / PY) : 0 }).filter(v => v > 0)
  ppps = removeOutliers(ppps); if (!ppps.length) return null
  const avgPy = Math.round(ppps.reduce((a, b) => a + b, 0) / ppps.length)
  const last = pool.sort((a, b) => (`${b.dealYear}${b.dealMonth}`).localeCompare(`${a.dealYear}${a.dealMonth}`))[0]
  const price = Math.round(parseInt((last.dealAmount || '0').replace(/,/g, '')))
  const dates = pool.map(t => `${t.dealYear}.${String(t.dealMonth).padStart(2, '0')}`).sort()
  return { avgPy, price, area: parseFloat(last.excluUseAr), floor: parseInt(last.floor || '0'), count: pool.length, latest: dates[dates.length - 1] }
}

export default function ReconAdminPage() {
  const [rows, setRows] = useState<Recon[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [group, setGroup] = useState<keyof typeof GROUPS>('기본')
  const [fontPx, setFontPx] = useState(12)
  const [savedKey, setSavedKey] = useState('')
  const [widths, setWidths] = useState<Record<string, number>>({})  // "그룹#인덱스" → 너비

  // 컬럼 리사이즈 (헤더 경계 드래그)
  function startResize(wkey: string, curW: number, e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => {
      const nw = Math.max(40, curW + (ev.clientX - startX))
      setWidths(prev => ({ ...prev, [wkey]: nw }))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('recon_master').select('*').order('dong').order('ticker')
    if (error) setMsg('조회 오류: ' + error.message)
    if (data) setRows(data as Recon[])
    setLoading(false)
  }, [])
  useEffect(() => { fetchRows() }, [fetchRows])

  async function saveField(id: string, field: string, value: unknown, prev: unknown) {
    const norm = (v: unknown) => Array.isArray(v) ? v.join(',') : (v ?? '')
    if (norm(value) === norm(prev)) return
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r))
    const { error } = await supabase.from('recon_master').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setMsg(`저장 실패(${field}): ` + error.message); return }
    const k = `${id}:${field}`; setSavedKey(k); setTimeout(() => setSavedKey(x => x === k ? '' : x), 1200)
  }

  async function refreshTrade(row: Recon) {
    const lawd = row.lawd as string
    if (!lawd) { setMsg(`${row.short_name}: lawd 없음`); return }
    setBusy(row.id); setMsg('')
    try {
      const trades = await fetchTrades(lawd, 12)
      const r = calcCurrent(trades, row)
      if (!r) { setMsg(`${row.short_name || row.name}: 실거래 없음`); return }
      await supabase.from('recon_master').update({
        avg_ppp: r.avgPy, latest_price: r.price, latest_area: r.area, latest_floor: r.floor,
        trade_count: r.count, latest_date: r.latest, price_updated: new Date().toISOString().slice(0, 10),
      }).eq('id', row.id)
      setMsg(`${row.short_name || row.name}: 최근 ${(r.price / 10000).toFixed(1)}억 · 평균 ${r.avgPy.toLocaleString()}만/평 (${r.count}건, ${r.latest})`)
      await fetchRows()
    } catch (e: unknown) { setMsg('조회 실패: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setBusy(null) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  const cols = GROUPS[group]
  const th = 'border border-gray-200 px-2 py-1 font-semibold text-gray-700 bg-gray-100 text-left whitespace-nowrap'
  const td = 'border border-gray-200 px-1 py-0.5 align-middle'

  function EditCell({ row, col, w }: { row: Recon; col: Col; w: number }) {
    const raw = row[col.key]
    const saved = savedKey === `${row.id}:${col.key}`
    if (col.bool) {
      return <td className={td + ' text-center'} style={{ width: w }}>
        <input type="checkbox" defaultChecked={!!raw} onChange={e => saveField(row.id, col.key, e.target.checked, raw)} />
      </td>
    }
    const shown = col.arr ? ((raw as string[] | null) || []).join(', ') : (raw ?? '')
    return <td className={td} style={{ width: w }}>
      <div className="relative">
        <input className="w-full border border-gray-200 rounded px-1.5 py-0.5 bg-white hover:border-blue-300 focus:bg-yellow-50 focus:border-blue-500 focus:outline-none"
          defaultValue={String(shown)}
          onBlur={e => { const v = e.target.value; const nv = col.arr ? (v ? v.split(',').map(s => s.trim()) : null) : col.num ? (v ? Number(v) : null) : v; saveField(row.id, col.key, nv, raw) }} />
        {saved && <span className="absolute -right-1 -top-1 text-green-600 text-xs bg-white rounded-full">✓</span>}
      </div>
    </td>
  }

  // 컬럼 실제 너비 (리사이즈 반영). wkey = 그룹#인덱스 (중복 key 대응)
  const wOf = (i: number, c: Col) => widths[`${group}#${i}`] ?? c.w

  function RoCell({ row, col, w }: { row: Recon; col: Col; w: number }) {
    if (col.key === 'warn_distortion') {
      return <td className={td + ' text-center'} style={{ width: w }}>{row[col.key] ? <span className="text-red-500">⚠️</span> : '—'}</td>
    }
    // 파생 계산 컬럼
    let num: number | null = null
    if (col.calc) num = col.calc(row)
    else {
      const raw = row[col.key]
      if (typeof raw === 'number') num = raw
      else if (raw != null && raw !== '' && !isNaN(Number(raw))) num = Number(raw)
      else return <td className={td + ' text-right text-gray-600'} style={{ width: w }}>{raw != null && raw !== '' ? String(raw) : '—'}</td>
    }
    if (num == null) return <td className={td + ' text-right text-gray-400'} style={{ width: w }}>—</td>
    // ㎡당가 변환
    const shown = col.m2 ? Math.round(num / PY) : num
    return <td className={td + ' text-right text-gray-700'} style={{ width: w }}>{shown.toLocaleString()}</td>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A5C] text-white px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-base font-semibold">🏗 재건축 단지 마스터 관리</h1><p className="text-xs opacity-80">강남 재건축 38개 · 편집 후 인덱스 자동 반영</p></div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
            <span className="text-xs opacity-70">글자</span>
            <button onClick={() => setFontPx(f => Math.max(9, f - 1))} className="w-6 h-6 rounded bg-white/20 text-sm">－</button>
            <span className="text-xs w-6 text-center">{fontPx}</span>
            <button onClick={() => setFontPx(f => Math.min(18, f + 1))} className="w-6 h-6 rounded bg-white/20 text-sm">＋</button>
          </div>
          <a href="/admin" className="text-xs text-blue-200 underline">← 대시보드</a>
        </div>
      </header>

      {/* 보기 그룹 탭 */}
      <div className="bg-white border-b px-6 py-2 flex gap-2">
        {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map(g => (
          <button key={g} onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-lg text-sm ${group === g ? 'bg-[#1B3A5C] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{g}</button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-2">{group === '인덱스' || group === '실거래' ? '읽기 전용 (스크립트/조회로 갱신)' : '흰 칸 클릭해 편집 → DB 자동저장(✓)'}</span>
      </div>

      {msg && <div className="bg-blue-50 text-[#1B3A5C] text-sm px-6 py-2 border-b border-blue-100">{msg}</div>}

      <div className="p-3 overflow-x-auto">
        <table className="border-collapse" style={{ fontSize: fontPx }}>
          <thead><tr>
            <th className={th} style={{ width: 44 }}>#</th>
            <th className={th} style={{ width: 100 }}>단지</th>
            {cols.map((c, i) => {
              const w = wOf(i, c)
              return (
                <th key={`${group}#${i}`} className={'relative ' + th + (c.ro ? ' !bg-amber-50' : '')} style={{ width: w, minWidth: w }}>
                  {c.label}
                  <span onMouseDown={e => startResize(`${group}#${i}`, w, e)}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40" />
                </th>
              )
            })}
            {group === '실거래' && <th className={th} style={{ width: 80 }}>작업</th>}
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-blue-50/30">
                <td className={td + ' text-center text-gray-400'}>{i + 1}</td>
                <td className={td + ' font-semibold whitespace-nowrap'}>
                  {String(r.short_name || r.name)}
                  {typeof r.stage === 'number' && <span className="text-gray-400 text-[0.8em] ml-1">{STAGE_NAME[r.stage as number] || r.stage}</span>}
                </td>
                {cols.map((c, i) => c.ro
                  ? <RoCell key={`${group}#${i}`} row={r} col={c} w={wOf(i, c)} />
                  : <EditCell key={`${group}#${i}`} row={r} col={c} w={wOf(i, c)} />)}
                {group === '실거래' && <td className={td + ' text-center'}>
                  <button onClick={() => refreshTrade(r)} disabled={busy === r.id}
                    className="px-2 py-0.5 bg-[#1B3A5C] text-white rounded text-[0.9em] disabled:opacity-50">{busy === r.id ? '...' : '조회'}</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-6 pb-4 text-xs text-gray-400">총 {rows.length}개 · CMC/NCMC/RAR·플래그는 배치 스크립트(calc_cmc·calc_ncmc·calc_flags)로 갱신 → 편집값 반영하려면 스크립트 재실행·JSON 내보내기 필요</p>
    </div>
  )
}
