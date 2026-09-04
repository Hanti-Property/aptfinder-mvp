// ============================================================
// 인덱스 계산 엔진 (단일 소스) — CMC · NCMC · RAR · RVI · 플래그
// 작성일: 2026-09-04
//
// 목적: 파이썬 스크립트(calc_cmc/calc_ncmc/calc_flags)와 RVI HTML의
//       계산 로직을 하나의 TS 모듈로 통합. Supabase recon_master 원천값에서
//       모든 파생 인덱스를 실시간 계산 → admin·RVI 화면이 공통 사용.
//
// ⚠️ 안전: 기존 파이썬 스크립트·complexes_master.json 은 그대로 유지(백업/검증용).
//         이 엔진 결과가 파이썬과 일치함을 검증한 뒤에만 화면에 연결.
//
// 산식 출처(동일하게 이식):
//   - CMC/대지평당가/등급     : scripts/calc_cmc.py
//   - NCMC/RAR/목표용적률      : scripts/calc_ncmc.py (v4 매핑NVP)
//   - 플래그(규모·신뢰·괴리)    : scripts/calc_flags.py
//   - RVI v1/v2·RRI·CAGR       : public/_internal_rvi.html (loadRRIRanking)
//
// 상수 튜닝은 이 파일 상단 CONSTANTS 한 곳에서만 수정.
// ============================================================

export const PY = 3.3058 // 평↔㎡ 환산 (1평 = 3.3058㎡)

// 파이썬 round()와 동일한 은행가 반올림(round-half-to-even). 파이썬 결과와 정합 위해 필수.
// 예) round(1.755,2)=1.75 (JS Math.round는 1.76). round(2.5)=2, round(3.5)=4.
export function pyRound(x: number, ndigits = 0): number {
  // toFixed는 실제 이진 double 값을 읽어 반올림 → 파이썬 round와 검증상 일치.
  // (0.125 같은 이진 정확 tie만 half-up으로 갈리나, CMC/NCMC 계산값엔 그런 tie가 없음)
  if (!isFinite(x)) return x
  return Number(x.toFixed(ndigits))
}

// ── 튜닝 상수 (한 곳에서 관리) ───────────────────────────────
export const CONSTANTS = {
  NVP_PREMIUM: 1.20,      // 신축 프리미엄 (매핑 없을 때만 적용)
  ANNUAL_RATE: 0.03,      // 연 상승률
  EXCLUSIVE_RATE: 0.75,   // 전용률 (연면적→전용)
  DONATION_RATE: 0.20,    // 기부채납 비율
  TARGET_FAR_BASE: 3.00,  // 기본 목표용적률
  HIGH_FAR_THRESHOLD: 3.00, // 현재 용적률(배수) 이상이면 고밀 예외
  HIGH_FAR_UPLIFT: 1.20,  // 고밀 예외 시 현재×1.2
  BASE_YEAR: 2026,        // 입주년 = BASE_YEAR + ETA
  GAP_WIDE_THRESHOLD: -25.0, // 괴리율 이 값 이하면 저평가 경고
}

// 동별 기준 NVP (만원/전용평) — calc_ncmc.py NVP_V2_BASE 와 동일. 매핑 폴백용.
export const NVP_V2_BASE: Record<string, number> = {
  압구정동: 20000, 청담동: 17000, 대치동: 15000, 삼성동: 14000,
  개포동: 13000, 도곡동: 13000, 일원동: 13000,
}
export const NVP_BASE_DEFAULT = 13000

// 목표용적률 override (calc_ncmc.py TARGET_FAR_OVERRIDE 와 동일). name 기준.
export const TARGET_FAR_OVERRIDE: Record<string, number> = {
  은마아파트: 3.20,
  '개포6차우성아파트': 2.50,
}

// RVI 점수화용 LOC 등급 (_internal_rvi.html)
const LOC_G: Record<string, number> = {
  압구정동: 100, 대치동: 100, 청담동: 100, 개포동: 80,
  도곡동: 80, 삼성동: 80, 논현동: 60, 일원동: 60,
}

// 분담금 보간 샘플 (_internal_rvi.html COST_SAMPLES)
const COST_SAMPLES = [
  { far: 150, costPerPy: 0 },
  { far: 152, costPerPy: 0 },
  { far: 175, costPerPy: 394 },
  { far: 204, costPerPy: 1830 },
]

// ── 원천 입력 타입 (recon_master snake_case 기준) ───────────
export interface ReconRow {
  name?: string; short_name?: string | null; dong?: string; ticker?: string | null
  jibun?: string | null; bjdong?: string | null; gu?: string
  eta?: number | null; move_in?: number | null; move_start_year?: number | null
  stage?: number | null; risk?: string | null; eta_provisional?: boolean | null
  far?: number | null            // 현재 용적률(%)
  plat_area?: number | null      // 대지면적(㎡)
  households?: number | null; h?: number | null; hhld_cnt?: number | null
  tot_area?: number | null; vlrat_estm_area?: number | null
  avg_ppp?: number | null        // 현재 전용평당가(만원/평)
  latest_price?: number | null   // 최근 실거래가(만원)
  latest_area?: number | null    // 전용면적(㎡)
  latest_date?: string | null    // YYYY.MM
  trade_count?: number | null
  // 매핑
  nvp_ref_codes?: string[] | null
  nvp_loc_weight?: number | null
  nvp_final?: number | null      // 최종 NVP (만원/전용평), 매핑 산출
  nvp_base?: number | null
  nvp_valid?: boolean | null
  [k: string]: unknown
}

// ── 계산 결과 타입 ───────────────────────────────────────────
export interface CalcResult {
  // CMC
  cmc: number | null            // 조원
  landPppMarket: number | null  // 대지 실거래 평당가(만원/평)
  capGrade: string | null
  // NCMC
  targetFar: number | null      // %
  targetFarRule: string
  ncmcNvpBase: number | null    // 실제 사용 기준 NVP(만원/전용평)
  ncmcNvpSource: 'mapped' | 'dong_const'
  ncmcNewPpp: number | null     // 재건축후 전용평당가
  ncmc: number | null           // 조원
  rar: number | null
  // 시간
  moveIn: number | null         // 입주년 = BASE_YEAR + ETA
  moveStartYear: number | null  // 이주개시(수동) — 없으면 null → 화면 TBA
  // 플래그
  sizeGrade: string
  tradeReliability: 'low' | 'mid' | 'high'
  latestMonthsAgo: number
  nvpGapRate: number            // 동평균 대비 대지평당가 괴리율(%)
  warnDistortion: boolean
  // RVI
  rviV1: number | null          // 물리 잠재력
  rvi: number | null            // v2 (ETA 반영)
  rri: number | null            // 재건축 수익률(%)
  cagr: number | null           // 연복리(%)
}

// ── 공용 헬퍼 ────────────────────────────────────────────────
const hhOf = (r: ReconRow) => r.households || r.h || r.hhld_cnt || 0
const platOf = (r: ReconRow) => r.plat_area || (r.vlrat_estm_area && r.far ? r.vlrat_estm_area / (r.far / 100) : 0) || 0

export function capGrade(cmcJo: number): string {
  if (cmcJo >= 10) return 'Mega Cap'
  if (cmcJo >= 5) return 'Large Cap'
  if (cmcJo >= 2) return 'Mid Cap'
  return 'Small Cap'
}

// 목표용적률 결정 (calc_ncmc.py target_far)
export function targetFar(name: string, curFar: number): { ftar: number; rule: string } {
  if (name in TARGET_FAR_OVERRIDE) return { ftar: TARGET_FAR_OVERRIDE[name], rule: 'override' }
  if (curFar >= CONSTANTS.HIGH_FAR_THRESHOLD) return { ftar: curFar * CONSTANTS.HIGH_FAR_UPLIFT, rule: 'high_far(현재×1.2)' }
  return { ftar: CONSTANTS.TARGET_FAR_BASE, rule: 'base(300%)' }
}

// 분담금 보간 (_internal_rvi.html interpolateCost)
export function interpolateCost(far: number): number {
  if (!far || far <= 0) return 750
  const s = COST_SAMPLES.slice().sort((a, b) => a.far - b.far)
  if (far <= s[0].far) return s[0].costPerPy
  if (far >= s[s.length - 1].far) return s[s.length - 1].costPerPy
  for (let i = 0; i < s.length - 1; i++) {
    if (far >= s[i].far && far <= s[i + 1].far) {
      const ratio = (far - s[i].far) / (s[i + 1].far - s[i].far)
      return Math.round(s[i].costPerPy + ratio * (s[i + 1].costPerPy - s[i].costPerPy))
    }
  }
  return s[s.length - 1].costPerPy
}

// 경과월 (calc_flags.py months_ago) — NOW 기준
export function monthsAgo(dateStr: string | null | undefined, now = new Date(CONSTANTS.BASE_YEAR, 8, 1)): number {
  // 기본 NOW = 2026-09-01 (calc_flags.py NOW와 정합; month는 0-index라 8=9월)
  if (!dateStr) return 99
  const parts = dateStr.split('.')
  if (parts.length < 2) return 99
  const y = parseInt(parts[0]), m = parseInt(parts[1])
  if (isNaN(y) || isNaN(m)) return 99
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
}

export function sizeGrade(h: number): string {
  if (h <= 300) return 'xs'
  if (h <= 600) return 's'
  if (h <= 900) return 'm'
  if (h <= 1000) return 'l'
  return 'xl'
}

export function tradeReliability(months: number, cnt: number): 'low' | 'mid' | 'high' {
  if (months >= 12 || cnt <= 1) return 'low'
  if (months >= 6 || cnt <= 2) return 'mid'
  return 'high'
}

// RVI 점수화 함수 (_internal_rvi.html)
const sNVP = (r: number) => r >= 40 ? 100 : r >= 30 ? 85 : r >= 20 ? 70 : r >= 10 ? 50 : r > 0 ? 30 : 0
const sFAR = (v: number) => v === 0 ? 0 : v <= 170 ? 100 : v <= 200 ? 75 : v <= 220 ? 50 : v <= 250 ? 25 : 0
const sTLA = (v: number) => v >= 200000 ? 100 : v >= 150000 ? 90 : v >= 100000 ? 80 : v >= 70000 ? 70 : v >= 50000 ? 60 : v >= 30000 ? 45 : v >= 10000 ? 30 : 15
const sAGE = (a: number) => a >= 45 ? 100 : a >= 40 ? 80 : a >= 35 ? 60 : 40

// ── 메인: 단건 계산 ──────────────────────────────────────────
// dongAvgLandPpp: 동별 평균 대지평당가 (nvpGapRate용). calcAll에서 미리 산출해 전달.
export function calcOne(r: ReconRow, dongAvgLandPpp?: number): CalcResult {
  const eta = r.eta != null ? r.eta : 10
  const h = hhOf(r)
  const plat = platOf(r)
  const curFarPct = r.far || 0
  const unitPrice = r.latest_price || 0
  const avgPpp = r.avg_ppp || 0

  // --- CMC ---
  let cmc: number | null = null, landPpp: number | null = null, grade: string | null = null
  if (h && plat && unitPrice) {
    const landSharePy = (plat / PY) / h
    landPpp = pyRound(unitPrice / landSharePy)
    cmc = pyRound(unitPrice * h / 1e8, 2)
    grade = capGrade(cmc)
  }

  // --- NCMC / RAR ---
  let targetFarPct: number | null = null, tfRule = '', nvpBaseUsed: number | null = null
  let nvpSrc: 'mapped' | 'dong_const' = 'dong_const'
  let newPpp: number | null = null, ncmc: number | null = null, rar: number | null = null
  if (r.ticker && cmc && curFarPct && plat) {
    const curFar = curFarPct / 100
    const { ftar, rule } = targetFar(r.name || '', curFar)
    tfRule = rule
    targetFarPct = Math.round(ftar * 100)
    // 기준 NVP: 매핑(nvp_final) 우선, 없으면 동별상수×신축프리미엄
    if (r.nvp_final) {
      nvpBaseUsed = r.nvp_final
      nvpSrc = 'mapped'
    } else {
      nvpBaseUsed = Math.round((NVP_V2_BASE[r.dong || ''] ?? NVP_BASE_DEFAULT) * CONSTANTS.NVP_PREMIUM)
      nvpSrc = 'dong_const'
    }
    newPpp = nvpBaseUsed * Math.pow(1 + CONSTANTS.ANNUAL_RATE, eta)
    const gfaPy = plat * ftar / PY
    const excluPy = gfaPy * CONSTANTS.EXCLUSIVE_RATE * (1 - CONSTANTS.DONATION_RATE)
    ncmc = pyRound(excluPy * newPpp / 1e8, 2)
    rar = cmc ? pyRound(ncmc / cmc, 2) : null
    newPpp = pyRound(newPpp)
  }

  // --- 시간 ---
  const moveIn = r.eta != null ? CONSTANTS.BASE_YEAR + Math.round(eta) : (r.move_in ?? null)
  const moveStartYear = r.move_start_year ?? null

  // --- 플래그 ---
  const ma = monthsAgo(r.latest_date)
  const tc = r.trade_count || 0
  const sg = sizeGrade(h)
  const rel = tradeReliability(ma, tc)
  const gap = (dongAvgLandPpp && landPpp) ? pyRound((landPpp - dongAvgLandPpp) / dongAvgLandPpp * 100, 1) : 0
  const warn = rel === 'low' || gap <= CONSTANTS.GAP_WIDE_THRESHOLD

  // --- RVI v1/v2 · RRI · CAGR ---
  let rviV1: number | null = null, rvi: number | null = null, rri: number | null = null, cagr: number | null = null
  if (r.ticker && curFarPct && avgPpp > 0) {
    // 기준 NVP(오늘): 매핑 nvp_final 우선(신축 프리미엄 미적용), 없으면 동별상수(프리미엄 미적용 — 원 HTML calcNvpV2와 동일)
    const nvpPppToday = r.nvp_final ?? (NVP_V2_BASE[r.dong || ''] ?? NVP_BASE_DEFAULT)
    const futurePpp = r.nvp_final
      ? r.nvp_final * Math.pow(1 + CONSTANTS.ANNUAL_RATE, eta)                      // 매핑: 프리미엄 미적용
      : nvpPppToday * CONSTANTS.NVP_PREMIUM * Math.pow(1 + CONSTANTS.ANNUAL_RATE, eta) // 폴백: ×1.2
    const area = r.latest_area || 76
    const excluPy = area / PY
    const currentPrice = unitPrice || avgPpp * excluPy
    const costPerPy = interpolateCost(curFarPct)
    const addCost = excluPy * costPerPy
    const totalInvest = currentPrice + addCost
    const futureValue = futurePpp * excluPy
    rri = totalInvest > 0 ? Math.round((futureValue - totalInvest) / totalInvest * 100 * 10) / 10 : null
    cagr = (totalInvest > 0 && eta > 0) ? Math.round((Math.pow(futureValue / totalInvest, 1 / eta) - 1) * 100 * 10) / 10 : null
    // 점수
    const nvpRate = avgPpp > 0 ? (nvpPppToday - avgPpp) / avgPpp * 100 : 0
    const lps = h > 0 && plat > 0 ? (plat / h) / PY : 0
    const locScore = LOC_G[r.dong || ''] || 50
    const tlaScore = sTLA(plat)
    const nvpScore = sNVP(nvpRate)
    const farScore = sFAR(curFarPct)
    const ageScore = sAGE(47)
    const lpsScore = lps >= 18 ? 100 : lps >= 12 ? 75 : lps >= 8 ? 50 : 25
    const nrtScore = 50
    const physScore = Math.round(tlaScore * 0.30 + locScore * 0.20 + nvpScore * 0.15 + farScore * 0.20 + ageScore * 0.05 + lpsScore * 0.05 + nrtScore * 0.05)
    const ETA_MAX = 20, RVI_BASE = 0.70
    const timeScore = Math.max(0, 1 - (eta / ETA_MAX))
    const realizeF = RVI_BASE + (1 - RVI_BASE) * timeScore
    rviV1 = physScore
    rvi = Math.round(physScore * realizeF)
  }

  return {
    cmc, landPppMarket: landPpp, capGrade: grade,
    targetFar: targetFarPct, targetFarRule: tfRule, ncmcNvpBase: nvpBaseUsed, ncmcNvpSource: nvpSrc,
    ncmcNewPpp: newPpp, ncmc, rar,
    moveIn, moveStartYear,
    sizeGrade: sg, tradeReliability: rel, latestMonthsAgo: ma, nvpGapRate: gap, warnDistortion: warn,
    rviV1, rvi, rri, cagr,
  }
}

// ── 전체 계산 (동평균 괴리율 반영) ──────────────────────────
export function calcAll(rows: ReconRow[]): Map<string, CalcResult> {
  // 재건축 대상(티커·CMC 산출 가능)만 동평균 대상
  const recon = rows.filter(r => r.ticker && (r.latest_price || 0) > 0 && platOf(r) > 0 && hhOf(r) > 0)
  // 동별 대지평당가 평균
  const byDong: Record<string, number[]> = {}
  for (const r of recon) {
    const h = hhOf(r), plat = platOf(r), up = r.latest_price || 0
    const landPpp = up / ((plat / PY) / h)
    ;(byDong[r.dong || ''] ||= []).push(landPpp)
  }
  const dongAvg: Record<string, number> = {}
  for (const k in byDong) dongAvg[k] = byDong[k].reduce((a, b) => a + b, 0) / byDong[k].length

  const out = new Map<string, CalcResult>()
  for (const r of rows) {
    const id = String((r.id as string) ?? r.ticker ?? r.name)
    out.set(id, calcOne(r, dongAvg[r.dong || '']))
  }
  return out
}
