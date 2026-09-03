'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// RVI 터미널과 동일한 실거래 프록시
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

// 최근 N개월 실거래 조회 (Lambda)
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

/** 84㎡ 기준(없으면 최근접) 전용평당가·㎡당가 산출 */
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

  // 84㎡ 우선(76~90), 없으면 84에 가장 가까운 면적
  let pool = mine.filter(t => { const a = parseFloat(t.excluUseAr || '0'); return a >= 76 && a <= 90 })
  if (!pool.length) {
    const sorted = [...mine].filter(t => parseFloat(t.excluUseAr || '0') > 0)
      .sort((a, b) => Math.abs(parseFloat(a.excluUseAr) - 84) - Math.abs(parseFloat(b.excluUseAr) - 84))
    if (!sorted.length) return null
    const nearest = parseFloat(sorted[0].excluUseAr)
    pool = mine.filter(t => Math.abs(parseFloat(t.excluUseAr || '0') - nearest) < 3)
  }
  // 평당가(전용), ㎡당가
  let ppps = pool.map(t => {
    const amt = parseInt((t.dealAmount || '0').replace(/,/g, ''))
    const ar = parseFloat(t.excluUseAr || '0')
    return ar > 0 ? amt / (ar / PY) : 0
  }).filter(v => v > 0)
  let perM2 = pool.map(t => {
    const amt = parseInt((t.dealAmount || '0').replace(/,/g, ''))
    const ar = parseFloat(t.excluUseAr || '0')
    return ar > 0 ? amt / ar : 0
  }).filter(v => v > 0)
  ppps = removeOutliers(ppps); perM2 = removeOutliers(perM2)
  if (!ppps.length) return null
  const avgPy = Math.round(ppps.reduce((a, b) => a + b, 0) / ppps.length)
  const avgM2 = Math.round(perM2.reduce((a, b) => a + b, 0) / perM2.length)
  // 최근 거래월
  const dates = pool.map(t => `${t.dealYear}.${String(t.dealMonth).padStart(2, '0')}`).sort()
  const areaAvg = pool.reduce((s, t) => s + parseFloat(t.excluUseAr || '0'), 0) / pool.length
  return { ppp: avgPy, m2: avgM2, count: pool.length, latest: dates[dates.length - 1], area: Math.round(areaAvg * 100) / 100 }
}

export default function NvpAdminPage() {
  const [rows, setRows] = useState<NvpRef[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('nvp_reference').select('*').order('gu').order('dong').order('built_year', { ascending: false })
    if (data) setRows(data as NvpRef[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  // 셀 편집 저장
  async function saveField(id: string, field: keyof NvpRef, value: string | number | null) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    await supabase.from('nvp_reference').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
  }

  // 단지별 실거래 조회 → 표준가 갱신
  async function refreshOne(row: NvpRef) {
    if (!row.lawd) { alert('시군구코드(lawd)가 없습니다.'); return }
    setBusy(row.id); setMsg('')
    try {
      const trades = await fetchTrades(row.lawd, 12)
      const r = calcStdPrice(trades, row)
      if (!r) {
        await supabase.from('nvp_reference').update({ ref_status: 'pending', price_updated: new Date().toISOString() }).eq('id', row.id)
        setMsg(`${row.short_name || row.name}: 최근 12개월 84㎡ 거래 없음 (pending)`)
        await fetchRows()
        return
      }
      await supabase.from('nvp_reference').update({
        std_ppp_exclu: r.ppp, std_price_m2: r.m2, std_area: r.area,
        trade_count: r.count, latest_date: r.latest,
        price_updated: new Date().toISOString(), ref_status: 'active',
      }).eq('id', row.id)
      setMsg(`${row.short_name || row.name}: ${r.ppp.toLocaleString()}만원/평 (${r.count}건, ${r.latest})`)
      await fetchRows()
    } catch (e: unknown) {
      setMsg('조회 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally { setBusy(null) }
  }

  async function refreshAll() {
    if (!confirm(`${rows.length}개 단지 실거래를 모두 조회합니다. 시간이 걸립니다. 진행할까요?`)) return
    for (const row of rows) { await refreshOne(row) }
    setMsg('전체 갱신 완료')
  }

  async function addRow() {
    const ref_code = prompt('새 단지 refCode (예: NVP-GN-XXX-001):')
    if (!ref_code) return
    const name = prompt('단지명:') || '(신규)'
    const { error } = await supabase.from('nvp_reference').insert({ ref_code, name, gu: '강남구', dong: '', ref_status: 'pending' })
    if (error) alert('추가 실패: ' + error.message)
    else fetchRows()
  }

  async function delRow(row: NvpRef) {
    if (!confirm(`"${row.name}" 삭제?`)) return
    await supabase.from('nvp_reference').delete().eq('id', row.id)
    fetchRows()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  const cell = 'border border-gray-200 px-2 py-1 text-sm'
  const inp = 'w-full bg-transparent focus:bg-yellow-50 focus:outline-none px-1'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1B3A5C] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">🏙 NVP 레퍼런스 관리</h1>
          <p className="text-xs opacity-80">신축 벤치마크 단지 · 실거래 84㎡ 기준 표준가</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addRow} className="text-sm px-3 py-1.5 rounded-lg border border-blue-300 text-blue-100 hover:bg-white/10">+ 단지 추가</button>
          <button onClick={refreshAll} disabled={!!busy} className="text-sm px-3 py-1.5 rounded-lg bg-white text-[#1B3A5C] font-semibold disabled:opacity-50">전체 실거래 갱신</button>
          <a href="/admin" className="text-xs text-blue-200 underline self-center">← 대시보드</a>
        </div>
      </header>

      {msg && <div className="bg-blue-50 text-[#1B3A5C] text-sm px-6 py-2 border-b border-blue-100">{msg}</div>}

      <div className="p-4 overflow-x-auto">
        <p className="text-xs text-gray-500 mb-2">셀을 클릭해 직접 수정 · 각 행 [실거래 조회]로 84㎡ 표준가 자동 산출 · 총 {rows.length}개</p>
        <table className="min-w-full bg-white border border-gray-200 text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className={cell}>refCode</th><th className={cell}>티커</th><th className={cell}>단지명</th>
              <th className={cell}>구</th><th className={cell}>동</th><th className={cell}>지번</th>
              <th className={cell}>준공</th><th className={cell}>세대</th>
              <th className={cell}>실거래명(tradeName)</th>
              <th className={cell + ' bg-amber-100'}>전용평당가</th><th className={cell + ' bg-amber-100'}>㎡당가</th>
              <th className={cell}>건수</th><th className={cell}>최근</th><th className={cell}>상태</th><th className={cell}>작업</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={r.ref_status === 'active' ? '' : 'bg-gray-50/50'}>
                <td className={cell + ' font-mono text-xs whitespace-nowrap'}>{r.ref_code}</td>
                <td className={cell}><input className={inp} defaultValue={r.ticker || ''} onBlur={e => saveField(r.id, 'ticker', e.target.value)} /></td>
                <td className={cell + ' whitespace-nowrap'}><input className={inp} defaultValue={r.name} onBlur={e => saveField(r.id, 'name', e.target.value)} /></td>
                <td className={cell}><input className={inp + ' w-14'} defaultValue={r.gu} onBlur={e => saveField(r.id, 'gu', e.target.value)} /></td>
                <td className={cell}><input className={inp + ' w-16'} defaultValue={r.dong} onBlur={e => saveField(r.id, 'dong', e.target.value)} /></td>
                <td className={cell}><input className={inp + ' w-16'} defaultValue={r.jibun || ''} onBlur={e => saveField(r.id, 'jibun', e.target.value)} /></td>
                <td className={cell}><input className={inp + ' w-14'} defaultValue={r.built_year ?? ''} onBlur={e => saveField(r.id, 'built_year', e.target.value ? Number(e.target.value) : null)} /></td>
                <td className={cell}><input className={inp + ' w-16'} defaultValue={r.households ?? ''} onBlur={e => saveField(r.id, 'households', e.target.value ? Number(e.target.value) : null)} /></td>
                <td className={cell}><input className={inp} defaultValue={(r.trade_name || []).join(', ')} onBlur={e => saveField(r.id, 'trade_name', e.target.value ? e.target.value.split(',').map(s => s.trim()) as unknown as string : null)} /></td>
                <td className={cell + ' text-right font-semibold text-[#1B3A5C]'}>{r.std_ppp_exclu ? r.std_ppp_exclu.toLocaleString() : '—'}</td>
                <td className={cell + ' text-right'}>{r.std_price_m2 ? r.std_price_m2.toLocaleString() : '—'}</td>
                <td className={cell + ' text-center text-gray-500'}>{r.trade_count ?? '—'}</td>
                <td className={cell + ' text-center text-gray-500 text-xs'}>{r.latest_date || '—'}</td>
                <td className={cell + ' text-center'}>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${r.ref_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{r.ref_status}</span>
                </td>
                <td className={cell + ' whitespace-nowrap'}>
                  <button onClick={() => refreshOne(r)} disabled={busy === r.id}
                    className="text-xs px-2 py-1 bg-[#1B3A5C] text-white rounded disabled:opacity-50">
                    {busy === r.id ? '조회중' : '실거래 조회'}
                  </button>
                  <button onClick={() => delRow(r)} className="text-xs px-2 py-1 text-red-500 ml-1">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
