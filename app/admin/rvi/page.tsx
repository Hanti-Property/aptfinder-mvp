'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calcAll, type ReconRow } from '@/lib/indexCalc'

// recon_master 원천 로우 → RVI HTML이 기대하는 camelCase 레코드로 변환.
// 엔진(calcAll) 계산 결과(cmc·ncmc·rar·rvi 등)를 병합해 주입 → 화면이 실시간 최신값 표시.
function toHtmlRecords(rows: Record<string, unknown>[]) {
  const calc = calcAll(rows as unknown as ReconRow[])
  return rows
    .filter(r => (r.gu as string) === '강남구' && r.ticker && ((r.status as string) || 'active') === 'active')
    .map(r => {
      const id = String((r.id as string) ?? r.ticker)
      const c = calc.get(id)
      return {
        // 식별·원천 (그대로)
        gu: r.gu, dong: r.dong, jibun: r.jibun, bjdong: r.bjdong,
        ticker: r.ticker, name: r.name, shortName: r.short_name,
        assetId: r.asset_id,
        eta: r.eta, stage: r.stage, etaProvisional: r.eta_provisional,
        far: r.far, farTBD: r.far_tbd,
        platArea: r.plat_area, h: r.households, hhldCnt: r.households,
        totArea: r.tot_area, vlRatEstmTotArea: r.vlrat_estm_area,
        avgPPP: r.avg_ppp, latestPrice: r.latest_price, latestArea: r.latest_area,
        tradeName: r.trade_name,
        // 엔진 계산값 (실시간)
        cmc: c?.cmc ?? null,
        landPppMarket: c?.landPppMarket ?? null,
        capGrade: c?.capGrade ?? null,
        ncmc: c?.ncmc ?? null,
        ncmcNewPpp: c?.ncmcNewPpp ?? null,
        rar: c?.rar ?? null,
        targetFar: c?.targetFar ?? null,
        moveIn: c?.moveIn ?? r.move_in ?? null,
        sizeGrade: c?.sizeGrade ?? null,
        tradeReliability: c?.tradeReliability ?? null,
        nvpGapRate: c?.nvpGapRate ?? null,
        latestMonthsAgo: c?.latestMonthsAgo ?? null,
        warnDistortion: c?.warnDistortion ?? false,
        // 엔진 RVI 점수 (랭킹이 옛 재계산 대신 이 값 사용)
        rvi: c?.rvi ?? null,
        rviV1: c?.rviV1 ?? null,
        rri: c?.rri ?? null,
      }
    })
}

export default function AdminRviPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'live' | 'fallback'>('loading')
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadAndInject() {
      const { data, error } = await supabase.from('recon_master').select('*')
      if (cancelled) return
      if (error || !data || !data.length) {
        // 조회 실패 → iframe은 자체 JSON 폴백으로 동작 (안전)
        setStatus('fallback')
        return
      }
      const records = toHtmlRecords(data as Record<string, unknown>[])
      setCount(records.length)
      const post = () => iframeRef.current?.contentWindow?.postMessage({ type: 'RECON_DATA', data: records }, '*')
      post()                 // iframe이 이미 로드됐으면 즉시
      setTimeout(post, 400)  // 로드 타이밍 보정 (리스너 준비 후 재전송)
      setStatus('live')
    }
    loadAndInject()
    return () => { cancelled = true }
  }, [])

  // iframe 로드 완료 시에도 한 번 더 주입 (경합 방지)
  function onFrameLoad() {
    supabase.from('recon_master').select('*').then(({ data, error }) => {
      if (error || !data || !data.length) return
      const records = toHtmlRecords(data as Record<string, unknown>[])
      iframeRef.current?.contentWindow?.postMessage({ type: 'RECON_DATA', data: records }, '*')
    })
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <div className="bg-[#0f0f23] border-b border-[#2a2a4a] px-4 py-2 flex items-center justify-between shrink-0">
        <a href="/admin" className="text-gray-400 hover:text-white text-xs">← 대시보드</a>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {status === 'live' ? `🟢 Supabase 실시간 (${count}개)` : status === 'fallback' ? '🟡 JSON 폴백' : '⏳ 로딩'}
          </span>
          <span className="text-[10px] bg-[#e74c3c] text-white px-2 py-0.5 rounded font-semibold">ADMIN ONLY</span>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        onLoad={onFrameLoad}
        src="/_internal_rvi.html"
        className="flex-1 w-full border-0"
        title="재건축 RVI 대시보드"
        allow="geolocation"
      />
    </div>
  )
}
