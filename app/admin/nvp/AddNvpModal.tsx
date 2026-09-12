'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchParcelData } from '@/lib/fetchParcelData'

// NVP 레퍼런스용 구 메타 (강남·서초·송파). refCode: SEL-{guCode}-{동코드}-###-NVP
const GU_META: Record<string, { lawd: string; guCode: string; dongs: Record<string, { code: string; bjdong: string }> }> = {
  강남구: {
    lawd: '11680', guCode: 'GN',
    dongs: {
      대치동: { code: 'DCH', bjdong: '10600' }, 개포동: { code: 'GPO', bjdong: '10300' },
      일원동: { code: 'ILW', bjdong: '11400' }, 도곡동: { code: 'DGK', bjdong: '10500' },
      압구정동: { code: 'APG', bjdong: '11000' }, 청담동: { code: 'CDM', bjdong: '10400' },
      삼성동: { code: 'SSD', bjdong: '10500' }, 역삼동: { code: 'YSM', bjdong: '10100' },
    },
  },
  서초구: {
    lawd: '11650', guCode: 'SC',
    dongs: {
      반포동: { code: 'BAN', bjdong: '10700' }, 잠원동: { code: 'JWN', bjdong: '10800' },
      서초동: { code: 'SCH', bjdong: '10600' }, 방배동: { code: 'BBE', bjdong: '10100' },
    },
  },
  송파구: {
    lawd: '11710', guCode: 'SP',
    dongs: {
      잠실동: { code: 'JSL', bjdong: '10100' }, 신천동: { code: 'SCN', bjdong: '10200' },
      풍납동: { code: 'PNP', bjdong: '10300' }, 송파동: { code: 'SPD', bjdong: '10400' },
      방이동: { code: 'BGI', bjdong: '10500' }, 오금동: { code: 'OGM', bjdong: '10600' },
      가락동: { code: 'GRK', bjdong: '10700' }, 문정동: { code: 'MJD', bjdong: '10800' },
      거여동: { code: 'GYD', bjdong: '11000' }, 마천동: { code: 'MCN', bjdong: '11100' },
    },
  },
}

interface Props {
  existing: { ref_code: string; bjdong?: string | null; jibun?: string | null; name: string; short_name?: string | null }[]
  onClose: () => void
  onSaved: () => void
}

export default function AddNvpModal({ existing, onClose, onSaved }: Props) {
  const [f, setF] = useState({
    name: '', short_name: '', ticker: '', gu: '강남구', dong: '', jibun: '', bjdong: '', lawd: '11680',
    built_year: '', households: '', trade_name: '', belt: '',
  })
  const [std, setStd] = useState<{ ppp: number | null; m2: number | null; count: number | null; latest: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: string, v: string) => setF(prev => {
    const next = { ...prev, [k]: v }
    if (k === 'gu') { next.lawd = GU_META[v]?.lawd || prev.lawd; next.dong = ''; next.bjdong = '' }
    if (k === 'dong') { const d = GU_META[prev.gu]?.dongs[v]; if (d) next.bjdong = d.bjdong }
    return next
  })
  const dongOptions = Object.keys(GU_META[f.gu]?.dongs || {})

  function suggestRefCode(): string {
    const meta = GU_META[f.gu]
    const prefix = `SEL-${meta?.guCode || 'XX'}-${meta?.dongs[f.dong]?.code || 'XXX'}-`
    const nums = existing.map(r => r.ref_code || '')
      .filter(a => a.startsWith(prefix) && a.endsWith('-NVP'))
      .map(a => parseInt(a.slice(prefix.length)) || 0)
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return prefix + String(next).padStart(3, '0') + '-NVP'
  }

  async function autoFetch() {
    if (!f.lawd || !f.bjdong || !f.jibun) { setMsg('구·동·지번을 먼저 입력하세요'); return }
    setBusy(true); setMsg('실거래 표준가 조회 중... (84㎡ 기준)')
    try {
      const names = f.trade_name ? f.trade_name.split(',').map(s => s.trim()) : (f.short_name ? [f.short_name] : [])
      const r = await fetchParcelData(f.lawd, f.bjdong, f.jibun, f.dong, names)
      // NVP 표준가 = 84㎡ 우선 전용평당가(avg_ppp) / ㎡당가 환산
      if (r.avg_ppp) {
        setStd({ ppp: r.avg_ppp, m2: Math.round(r.avg_ppp / 3.3058), count: r.trade_count, latest: r.latest_date })
        setMsg(`표준가 ${r.avg_ppp.toLocaleString()}만원/평 (${r.trade_count}건, ${r.latest_date})`)
      } else {
        setStd(null); setMsg('실거래 미확보 — 실거래명 확인 필요 (저장 후 [조회]로 재시도 가능)')
      }
    } catch (e) { setMsg('조회 실패: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setBusy(false) }
  }

  async function save() {
    if (!f.name || !f.dong) { setMsg('단지명·동은 필수'); return }
    const refCode = suggestRefCode()
    const dup = existing.find(r => r.bjdong === f.bjdong && r.jibun === f.jibun)
    if (dup) { setMsg(`같은 지번 NVP 존재: ${dup.short_name || dup.name}`); return }
    setBusy(true)
    const row: Record<string, unknown> = {
      ref_code: refCode, ticker: f.ticker || null, name: f.name, short_name: f.short_name || null,
      gu: f.gu, dong: f.dong, jibun: f.jibun || null, bjdong: f.bjdong || null, lawd: f.lawd || null,
      built_year: f.built_year ? Number(f.built_year) : null,
      households: f.households ? Number(f.households) : null,
      trade_name: f.trade_name ? f.trade_name.split(',').map(s => s.trim()) : null,
      belt: f.belt || null,
      ref_status: std?.ppp ? 'active' : 'pending',
    }
    if (std?.ppp) Object.assign(row, {
      std_ppp_exclu: std.ppp, std_price_m2: std.m2, trade_count: std.count, latest_date: std.latest,
      price_updated: new Date().toISOString(),
    })
    const { error } = await supabase.from('nvp_reference').insert(row)
    setBusy(false)
    if (error) { setMsg('저장 실패: ' + error.message); return }
    onSaved(); onClose()
  }

  const inp = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none'
  const lbl = 'text-xs text-gray-500 mb-0.5 block'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-[#1B3A5C]">🏙 NVP 레퍼런스 추가 (신축 벤치마크)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">구·동·지번 입력 → <b>[표준가 조회]</b>로 84㎡ 실거래 전용평당가 자동 산출 → 저장. refCode는 자동 생성(SEL-구-동-순번-NVP).</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className={lbl}>구 * (lawd 자동)</label><select className={inp} value={f.gu} onChange={e => set('gu', e.target.value)}>{Object.keys(GU_META).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label className={lbl}>동 * (bjdong 자동)</label><input className={inp} value={f.dong} onChange={e => set('dong', e.target.value)} placeholder="예: 잠실동" list="nvp-dong-list" /><datalist id="nvp-dong-list">{dongOptions.map(d => <option key={d} value={d} />)}</datalist></div>
          <div><label className={lbl}>단지명 *</label><input className={inp} value={f.name} onChange={e => set('name', e.target.value)} placeholder="예: 잠실엘스" /></div>
          <div><label className={lbl}>약칭</label><input className={inp} value={f.short_name} onChange={e => set('short_name', e.target.value)} placeholder="예: 엘스" /></div>
          <div><label className={lbl}>티커</label><input className={inp} value={f.ticker} onChange={e => set('ticker', e.target.value)} placeholder="예: JSLS" /></div>
          <div><label className={lbl}>지번 *</label><input className={inp} value={f.jibun} onChange={e => set('jibun', e.target.value)} placeholder="예: 40" /></div>
          <div><label className={lbl}>실거래명 (쉼표구분)</label><input className={inp} value={f.trade_name} onChange={e => set('trade_name', e.target.value)} placeholder="지도/실거래에 뜨는 이름" /></div>
          <div><label className={lbl}>준공년도</label><input className={inp} value={f.built_year} onChange={e => set('built_year', e.target.value)} placeholder="예: 2008" /></div>
          <div><label className={lbl}>세대수</label><input className={inp} value={f.households} onChange={e => set('households', e.target.value)} placeholder="선택" /></div>
          <div><label className={lbl}>권역(belt)</label><input className={inp} value={f.belt} onChange={e => set('belt', e.target.value)} placeholder="예: 한강벨트 (선택)" /></div>
        </div>
        <div className="text-xs text-gray-400 mb-3">refCode(자동): <b className="font-mono text-gray-600">{f.dong ? suggestRefCode() : 'SEL-…-NVP'}</b></div>

        <div className="flex gap-2 mb-3">
          <button onClick={autoFetch} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">{busy ? '조회 중...' : '🔍 표준가 조회'}</button>
          <span className="text-xs text-gray-500 self-center">{msg}</span>
        </div>

        {std && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm">
            <b className="text-[#1B3A5C]">전용평당가 {std.ppp?.toLocaleString()}만원/평</b> · ㎡당 {std.m2?.toLocaleString()}만 · {std.count}건 · {std.latest}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm">취소</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">저장</button>
        </div>
      </div>
    </div>
  )
}
