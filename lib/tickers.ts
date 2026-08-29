/**
 * 강남구 단지 티커 마스터 (R6-1 자산 시가총액 지수 체계)
 *
 * 규칙:
 * - 티커는 대소문자를 구분하지 않는다 (MIDO = mido = Mido). 내부에서 항상 대문자로 정규화한다.
 * - 문자 집합: 영문자 + 숫자 + 하이픈(-). 슬래시(/)는 URL 충돌로 사용하지 않는다.
 * - 화면 표시는 "약칭 (티커)" 형식을 기본으로 한다.  예) "은마 (EM)"
 *
 * 데이터 원본: public/data/gangnam_ticker_master.json
 * 마스터 문서: aptfinder_ticker_master_gangnam.md
 */

import tickerData from '@/public/data/gangnam_ticker_master.json'

export interface TickerRecord {
  ticker: string        // 대문자 정규화된 티커 (예: "EM", "APHD6-7")
  shortName: string     // 약칭 (예: "은마", "압구정현대6-7")
  name: string          // 정식 단지명 (예: "은마아파트")
  gu: string
  dong: string
  household: number
  reconStage: string
  status: string        // "유효" | "미추진"
  note?: string
  lawd: string          // 법정동 시군구코드 (강남구 11680)
  jibun: string         // 대표 지번 (본번 또는 본번-부번)
  bjdong: string        // 법정동코드 (5자리)
}

export const TICKERS: TickerRecord[] = tickerData as TickerRecord[]

/** 티커 정규화: 대소문자 무관 → 대문자, 공백 제거 */
export function normalizeTicker(raw: string): string {
  return (raw || '').trim().toUpperCase()
}

// --- 조회 인덱스 (모두 대소문자/공백 무관) ---
const byTicker = new Map<string, TickerRecord>()
const byName = new Map<string, TickerRecord>()
const byShort = new Map<string, TickerRecord>()
const byJibunKey = new Map<string, TickerRecord>() // `${bjdong}-${jibun}`

const nameKey = (s: string) => (s || '').replace(/\s+/g, '').toUpperCase()

for (const r of TICKERS) {
  byTicker.set(normalizeTicker(r.ticker), r)
  byName.set(nameKey(r.name), r)
  byShort.set(nameKey(r.shortName), r)
  byJibunKey.set(`${r.bjdong}-${r.jibun}`, r)
}

/** 티커로 조회 (대소문자 무관) */
export function findByTicker(ticker: string): TickerRecord | undefined {
  return byTicker.get(normalizeTicker(ticker))
}

/** 정식 단지명 또는 약칭으로 조회 (공백/대소문자 무관, 부분 폴백 포함) */
export function findByName(name: string): TickerRecord | undefined {
  if (!name) return undefined
  const k = nameKey(name)
  const exact = byName.get(k) || byShort.get(k)
  if (exact) return exact
  // 폴백: 정식 단지명이 입력값을 포함하거나 그 반대
  return TICKERS.find(
    (r) => nameKey(r.name).includes(k) || k.includes(nameKey(r.name)) ||
           nameKey(r.shortName).includes(k) || k.includes(nameKey(r.shortName))
  )
}

/** 법정동코드 + 지번으로 조회 (지번 우선 매칭 원칙) */
export function findByJibun(bjdong: string, jibun: string): TickerRecord | undefined {
  return byJibunKey.get(`${bjdong}-${jibun}`)
}

/**
 * 화면 표시용 라벨 "약칭 (티커)" 생성.
 * 티커 마스터에 없는 단지명이면 원래 이름을 그대로 반환한다.
 * @example formatComplexLabel('은마아파트') => '은마 (EM)'
 */
export function formatComplexLabel(name: string): string {
  const r = findByName(name)
  return r ? `${r.shortName} (${r.ticker})` : name
}

/**
 * 티커 레코드를 "약칭 (티커)" 로 표시.
 */
export function labelOf(r: TickerRecord): string {
  return `${r.shortName} (${r.ticker})`
}
