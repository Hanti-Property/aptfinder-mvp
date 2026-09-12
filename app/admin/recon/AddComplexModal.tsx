'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchParcelData, type ParcelResult } from '@/lib/fetchParcelData'

// 구 → {lawd, guCode(자산코드 중간), 동별 {동코드, bjdong}}
// 자산코드 규칙: SEL-{guCode}-{동코드}-###
const GU_META: Record<string, { lawd: string; guCode: string; dongs: Record<string, { code: string; bjdong: string }> }> = {
  강남구: {
    lawd: '11680', guCode: 'GN',
    dongs: {
      대치동: { code: 'DCH', bjdong: '10600' }, 개포동: { code: 'GPO', bjdong: '10300' },
      일원동: { code: 'ILW', bjdong: '11400' }, 도곡동: { code: 'DGK', bjdong: '10500' },
      압구정동: { code: 'APG', bjdong: '11000' }, 청담동: { code: 'CDM', bjdong: '10400' },
      삼성동: { code: 'SSD', bjdong: '10500' }, 역삼동: { code: 'YSM', bjdong: '10100' },
      논현동: { code: 'NHY', bjdong: '10800' },
    },
  },
  송파구: {
    lawd: '11710', guCode: 'SP',
    dongs: {
      잠실동: { code: 'JSL', bjdong: '10100' }, 신천동: { code: 'SCN', bjdong: '10200' },
      풍납동: { code: 'PNP', bjdong: '10300' }, 송파동: { code: 'SPD', bjdong: '10400' },
      방이동: { code: 'BGI', bjdong: '10500' }, 오금동: { code: 'OGM', bjdong: '10600' },
      가락동: { code: 'GRK', bjdong: '10700' }, 문정동: { code: 'MJD', bjdong: '10800' },
      장지동: { code: 'JJD', bjdong: '10900' }, 거여동: { code: 'GYD', bjdong: '11000' },
      마천동: { code: 'MCN', bjdong: '11100' },
    },
  },
  서초구: {
    lawd: '11650', guCode: 'SC',
    dongs: {
      방배동: { code: 'BBE', bjdong: '10100' }, 양재동: { code: 'YJE', bjdong: '10200' },
      우면동: { code: 'UMN', bjdong: '10300' }, 원지동: { code: 'WJI', bjdong: '10400' },
      잠원동: { code: 'JWN', bjdong: '10500' }, 반포동: { code: 'BAN', bjdong: '10700' },
      서초동: { code: 'SCH', bjdong: '10800' }, 내곡동: { code: 'NGK', bjdong: '10900' },
    },
  },
  강동구: {
    lawd: '11740', guCode: 'GD',
    dongs: {
      명일동: { code: 'MYD', bjdong: '10100' }, 고덕동: { code: 'GDK', bjdong: '10200' },
      상일동: { code: 'SID', bjdong: '10300' }, 길동: { code: 'GIL', bjdong: '10400' },
      둔촌동: { code: 'DCN', bjdong: '10500' }, 암사동: { code: 'ASA', bjdong: '10600' },
      성내동: { code: 'SND', bjdong: '10700' }, 천호동: { code: 'CHO', bjdong: '10800' },
      강일동: { code: 'GID', bjdong: '11000' },
    },
  },
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
  // 물리·시세 값 (자동조회로 채우거나 직접 입력) — 문자열로 관리 후 저장 시 숫자 변환
  const [m, setM] = useState({
    plat_area: '', far: '', households: '', tot_area: '',
    avg_ppp: '', latest_price: '', latest_area: '', latest_date: '', trade_count: '',
  })
  const [parcel, setParcel] = useState<ParcelResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const setMv = (k: string, v: string) => setM(prev => ({ ...prev, [k]: v }))

  const set = (k: string, v: string) => {
    setF(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'gu') {
        // 구 변경 시 lawd 자동, 동/bjdong 초기화
        next.lawd = GU_META[v]?.lawd || prev.lawd
        next.dong = ''; next.bjdong = ''
      }
      if (k === 'dong') {
        // 동 입력 시 현재 구 기준 bjdong 자동
        const d = GU_META[prev.gu]?.dongs[v]
        if (d) next.bjdong = d.bjdong
      }
      return next
    })
  }

  // 자산코드 자동 제안: SEL-{guCode}-{동코드}-### (기존 최대순번+1)
  function suggestAssetId(): string {
    const meta = GU_META[f.gu]
    const guCode = meta?.guCode || 'XX'
    const dongCode = meta?.dongs[f.dong]?.code || 'XXX'
    const prefix = `SEL-${guCode}-${dongCode}-`
    const nums = existing
      .map(r => String(r.asset_id || ''))
      .filter(a => a.startsWith(prefix))
      .map(a => parseInt(a.slice(prefix.length)) || 0)
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return prefix + String(next).padStart(3, '0')
  }

  const dongOptions = Object.keys(GU_META[f.gu]?.dongs || {})

  async function autoFetch() {
    if (!f.lawd || !f.bjdong || !f.jibun) { setMsg('시군구코드·법정동코드·지번을 먼저 입력하세요'); return }
    setBusy(true); setMsg('국토부 조회 중... (실거래·토지대장·건축물대장)')
    try {
      const tradeNames = f.trade_name ? f.trade_name.split(',').map(s => s.trim()) : (f.short_name ? [f.short_name] : [])
      const r = await fetchParcelData(f.lawd, f.bjdong, f.jibun, f.dong, tradeNames)
      setParcel(r)
      // 조회된 값을 입력칸에 자동 채움(없으면 빈칸 유지 → 수동 입력). 기존 입력값이 있으면 유지.
      setM(prev => ({
        plat_area: r.plat_area != null ? String(r.plat_area) : prev.plat_area,
        far: r.far != null ? String(r.far) : prev.far,
        households: r.households != null ? String(r.households) : prev.households,
        tot_area: r.tot_area != null ? String(r.tot_area) : prev.tot_area,
        avg_ppp: r.avg_ppp != null ? String(r.avg_ppp) : prev.avg_ppp,
        latest_price: r.latest_price != null ? String(r.latest_price) : prev.latest_price,
        latest_area: r.latest_area != null ? String(r.latest_area) : prev.latest_area,
        latest_date: r.latest_date || prev.latest_date,
        trade_count: r.trade_count != null ? String(r.trade_count) : prev.trade_count,
      }))
      setMsg(`조회 완료 · 대장${r.sources.recap ? '✓' : '✗'} 토지${r.sources.land ? '✓' : '✗'} 실거래${r.sources.trade ? '✓' : '✗'} · 빈 값은 직접 입력하세요`)
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
    // 물리·시세: 입력칸(m) 값 사용 (자동조회로 채웠거나 직접 입력). 빈칸은 null.
    const numOrNull = (s: string) => { const t = s.trim(); return t === '' ? null : Number(t) }
    Object.assign(row, {
      plat_area: numOrNull(m.plat_area), far: numOrNull(m.far), households: numOrNull(m.households),
      tot_area: numOrNull(m.tot_area), vlrat_estm_area: parcel?.vlrat_estm_area ?? null,
      avg_ppp: numOrNull(m.avg_ppp), latest_price: numOrNull(m.latest_price), latest_area: numOrNull(m.latest_area),
      latest_date: m.latest_date.trim() || null, trade_count: numOrNull(m.trade_count),
      price_updated: new Date().toISOString().slice(0, 10),
    })
    const { error } = await supabase.from('recon_master').insert(row)
    setBusy(false)
    if (error) { setMsg('저장 실패: ' + error.message); return }
    onSaved(); onClose()
  }

  const inp = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none'
  const lbl = 'text-xs text-gray-500 mb-0.5 block'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[#1B3A5C]">🏗 재건축 단지 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">지번 입력 → <b>[자동 조회]</b>로 대지면적·용적률·세대수·시세를 국토부에서 수집 → 확인 후 저장(작성중). 값 검증 후 목록에서 &apos;운영&apos;으로 전환하세요.</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={lbl}>구 * (lawd 자동)</label><select className={inp} value={f.gu} onChange={e => set('gu', e.target.value)}>{Object.keys(GU_META).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label className={lbl}>동 * (bjdong 자동)</label><input className={inp} value={f.dong} onChange={e => set('dong', e.target.value)} placeholder="예: 잠실동" list="dong-list" /><datalist id="dong-list">{dongOptions.map(d => <option key={d} value={d} />)}</datalist></div>
          <div><label className={lbl}>단지명 *</label><input className={inp} value={f.name} onChange={e => set('name', e.target.value)} placeholder="예: 잠실주공5단지" /></div>
          <div><label className={lbl}>약칭</label><input className={inp} value={f.short_name} onChange={e => set('short_name', e.target.value)} placeholder="예: 잠실5" /></div>
          <div><label className={lbl}>티커</label><input className={inp} value={f.ticker} onChange={e => set('ticker', e.target.value)} placeholder="예: JS5" /></div>
          <div><label className={lbl}>지번 *</label><input className={inp} value={f.jibun} onChange={e => set('jibun', e.target.value)} placeholder="예: 27 또는 658-1" /></div>
          <div><label className={lbl}>실거래명 (쉼표구분)</label><input className={inp} value={f.trade_name} onChange={e => set('trade_name', e.target.value)} placeholder="지도/실거래에 뜨는 이름" /></div>
          <div><label className={lbl}>시군구코드(lawd)</label><input className={inp} value={f.lawd} onChange={e => set('lawd', e.target.value)} /></div>
          <div><label className={lbl}>법정동코드(bjdong)</label><input className={inp} value={f.bjdong} onChange={e => set('bjdong', e.target.value)} /></div>
        </div>
        <div className="text-xs text-gray-400 mb-3">자산코드(자동): <b className="font-mono text-gray-600">{f.dong ? suggestAssetId() : 'SEL-GN-…'}</b></div>

        <div className="flex gap-2 mb-3">
          <button onClick={autoFetch} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? '조회 중...' : '🔍 자동 조회'}</button>
          <span className="text-xs text-gray-500 self-center">{msg}</span>
        </div>

        {/* 물리·시세 값: 자동조회로 채우거나 직접 입력 (편집 가능) */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
          <div className="text-xs text-gray-500 mb-2">📐 물리·시세 값 <span className="text-gray-400">— 자동조회로 채워지며, 비거나 틀리면 직접 입력/수정하세요 {parcel && <span>({parcel.farRule && `용적률: ${parcel.farRule}`})</span>}</span></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={lbl}>대지면적㎡</label><input className={inp} value={m.plat_area} onChange={e => setMv('plat_area', e.target.value)} placeholder="예: 20876" /></div>
            <div><label className={lbl}>현재 용적률%</label><input className={inp} value={m.far} onChange={e => setMv('far', e.target.value)} placeholder="예: 179" /></div>
            <div><label className={lbl}>세대수</label><input className={inp} value={m.households} onChange={e => setMv('households', e.target.value)} placeholder="예: 459" /></div>
            <div><label className={lbl}>연면적㎡</label><input className={inp} value={m.tot_area} onChange={e => setMv('tot_area', e.target.value)} placeholder="선택" /></div>
            <div><label className={lbl}>현재평당가(만/평)</label><input className={inp} value={m.avg_ppp} onChange={e => setMv('avg_ppp', e.target.value)} placeholder="자동/수동" /></div>
            <div><label className={lbl}>최근실거래(만)</label><input className={inp} value={m.latest_price} onChange={e => setMv('latest_price', e.target.value)} placeholder="자동/수동" /></div>
          </div>
          {parcel && parcel.warnings.length > 0 && (
            <ul className="mt-2 text-xs text-amber-600 list-disc pl-4">
              {parcel.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm">취소</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">저장 (작성중으로)</button>
        </div>
      </div>
    </div>
  )
}
