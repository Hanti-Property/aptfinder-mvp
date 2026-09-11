'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchParcelData, type ParcelResult } from '@/lib/fetchParcelData'

// 동 → 자산코드 동코드 (기존 asset_id 규칙 SEL-GN-XXX-###)
const DONG_CODE: Record<string, string> = {
  대치동: 'DCH', 개포동: 'GPO', 일원동: 'ILW', 도곡동: 'DGK',
  압구정동: 'APG', 청담동: 'CDM', 삼성동: 'SSD', 역삼동: 'YSM', 논현동: 'NHY',
}
// 동 → 법정동코드(bjdong) 자동 (강남구)
const DONG_BJDONG: Record<string, string> = {
  대치동: '10600', 개포동: '10300', 일원동: '11400', 도곡동: '10500',
  압구정동: '11000', 청담동: '10400', 삼성동: '10500', 역삼동: '10100', 논현동: '10800',
}

interface Props {
  existing: Record<string, unknown>[]   // 중복 체크용 (기존 rows)
  onClose: () => void
  onSaved: () => void                    // 저장 후 목록 새로고침
}

export default function AddComplexModal({ existing, onClose, onSaved }: Props) {
  const [f, setF] = useState({
    name: '', short_name: '', ticker: '', gu: '강남구', dong: '', jibun: '', bjdong: '', lawd: '11680', trade_name: '',
  })
  const [parcel, setParcel] = useState<ParcelResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: string, v: string) => {
    setF(prev => {
      const next = { ...prev, [k]: v }
      // 동 입력 시 bjdong 자동
      if (k === 'dong' && DONG_BJDONG[v]) next.bjdong = DONG_BJDONG[v]
      return next
    })
  }

  // 자산코드 자동 제안 (동코드 + 기존 최대순번+1)
  function suggestAssetId(): string {
    const code = DONG_CODE[f.dong] || 'XXX'
    const prefix = `SEL-GN-${code}-`
    const nums = existing
      .map(r => String(r.asset_id || ''))
      .filter(a => a.startsWith(prefix))
      .map(a => parseInt(a.slice(prefix.length)) || 0)
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return prefix + String(next).padStart(3, '0')
  }

  async function autoFetch() {
    if (!f.lawd || !f.bjdong || !f.jibun) { setMsg('시군구코드·법정동코드·지번을 먼저 입력하세요'); return }
    setBusy(true); setMsg('국토부 조회 중... (실거래·토지대장·건축물대장)')
    try {
      const tradeNames = f.trade_name ? f.trade_name.split(',').map(s => s.trim()) : (f.short_name ? [f.short_name] : [])
      const r = await fetchParcelData(f.lawd, f.bjdong, f.jibun, f.dong, tradeNames)
      setParcel(r)
      setMsg(`조회 완료 · 대장${r.sources.recap ? '✓' : '✗'} 토지${r.sources.land ? '✓' : '✗'} 실거래${r.sources.trade ? '✓' : '✗'}`)
    } catch (e) { setMsg('조회 실패: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setBusy(false) }
  }

  async function save() {
    if (!f.name || !f.dong) { setMsg('단지명·동은 필수'); return }
    // 지번 중복 체크
    const dup = existing.find(r => r.bjdong === f.bjdong && r.jibun === f.jibun)
    if (dup) { setMsg(`같은 지번 단지 존재: ${dup.short_name || dup.name} — 중복 추가 방지`); return }
    setBusy(true)
    const assetId = suggestAssetId()
    const row: Record<string, unknown> = {
      asset_id: assetId, ticker: f.ticker || null, name: f.name, short_name: f.short_name || null,
      gu: f.gu, dong: f.dong, jibun: f.jibun || null, bjdong: f.bjdong || null, lawd: f.lawd || null,
      trade_name: f.trade_name ? f.trade_name.split(',').map(s => s.trim()) : null,
      status: 'draft', type: 'reconstruction',
    }
    if (parcel) Object.assign(row, {
      plat_area: parcel.plat_area, far: parcel.far, households: parcel.households,
      tot_area: parcel.tot_area, vlrat_estm_area: parcel.vlrat_estm_area,
      avg_ppp: parcel.avg_ppp, latest_price: parcel.latest_price, latest_area: parcel.latest_area,
      latest_date: parcel.latest_date, trade_count: parcel.trade_count,
      price_updated: new Date().toISOString().slice(0, 10),
    })
    const { error } = await supabase.from('recon_master').insert(row)
    setBusy(false)
    if (error) { setMsg('저장 실패: ' + error.message); return }
    onSaved(); onClose()
  }

  const inp = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none'
  const lbl = 'text-xs text-gray-500 mb-0.5 block'
  const pv = (v: number | string | null) => v == null ? <span className="text-gray-300">—</span> : <b>{typeof v === 'number' ? v.toLocaleString() : v}</b>

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[#1B3A5C]">🏗 재건축 단지 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">지번 입력 → <b>[자동 조회]</b>로 대지면적·용적률·세대수·시세를 국토부에서 수집 → 확인 후 저장(작성중). 값 검증 후 목록에서 &apos;운영&apos;으로 전환하세요.</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={lbl}>단지명 *</label><input className={inp} value={f.name} onChange={e => set('name', e.target.value)} placeholder="예: 압구정한양8차" /></div>
          <div><label className={lbl}>약칭</label><input className={inp} value={f.short_name} onChange={e => set('short_name', e.target.value)} placeholder="예: 압구정한양8" /></div>
          <div><label className={lbl}>티커</label><input className={inp} value={f.ticker} onChange={e => set('ticker', e.target.value)} placeholder="예: APHY8" /></div>
          <div><label className={lbl}>동 * (bjdong 자동)</label><input className={inp} value={f.dong} onChange={e => set('dong', e.target.value)} placeholder="예: 압구정동" list="dong-list" /><datalist id="dong-list">{Object.keys(DONG_BJDONG).map(d => <option key={d} value={d} />)}</datalist></div>
          <div><label className={lbl}>지번 *</label><input className={inp} value={f.jibun} onChange={e => set('jibun', e.target.value)} placeholder="예: 490 또는 658-1" /></div>
          <div><label className={lbl}>실거래명 (쉼표구분)</label><input className={inp} value={f.trade_name} onChange={e => set('trade_name', e.target.value)} placeholder="지도/실거래에 뜨는 이름" /></div>
          <div><label className={lbl}>시군구코드(lawd)</label><input className={inp} value={f.lawd} onChange={e => set('lawd', e.target.value)} /></div>
          <div><label className={lbl}>법정동코드(bjdong)</label><input className={inp} value={f.bjdong} onChange={e => set('bjdong', e.target.value)} /></div>
        </div>
        <div className="text-xs text-gray-400 mb-3">자산코드(자동): <b className="font-mono text-gray-600">{f.dong ? suggestAssetId() : 'SEL-GN-…'}</b></div>

        <div className="flex gap-2 mb-3">
          <button onClick={autoFetch} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? '조회 중...' : '🔍 자동 조회'}</button>
          <span className="text-xs text-gray-500 self-center">{msg}</span>
        </div>

        {parcel && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div>대지면적㎡: {pv(parcel.plat_area)}</div>
              <div>용적률: {pv(parcel.far)}% <span className="text-[0.8em] text-gray-400">({parcel.farRule})</span></div>
              <div>세대수: {pv(parcel.households)}</div>
              <div>연면적㎡: {pv(parcel.tot_area)}</div>
              <div>현재평당가: {pv(parcel.avg_ppp)}</div>
              <div>최근실거래: {pv(parcel.latest_price)} ({parcel.latest_date || '—'})</div>
            </div>
            {parcel.warnings.length > 0 && (
              <ul className="mt-2 text-xs text-amber-600 list-disc pl-4">
                {parcel.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm">취소</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">저장 (작성중으로)</button>
        </div>
      </div>
    </div>
  )
}
