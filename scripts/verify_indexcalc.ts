// TS 계산엔진(lib/indexCalc.ts) 검증. 두 파트:
//  파트1(회귀): 파이썬 유물값(complexes_master.json)과 대조. 단 NCMC 산식 변경(2026-09 A안,
//               미래상승 제거)으로 바뀐 필드(ncmc/ncmcNewPpp/rar)는 제외 — 안 바뀐 계산만 대조.
//  파트2(케이스): NCMC A안 새 산식을 손검증한 실제 케이스(오금현대 등) 기대값으로 검증.
// 실행: npx tsc scripts/verify_indexcalc.ts lib/indexCalc.ts --outDir .verify_out --module commonjs --target es2020 --moduleResolution node --esModuleInterop
//       node .verify_out/scripts/verify_indexcalc.js
import * as fs from 'fs'
import * as path from 'path'
import { calcAll, calcOne, ReconRow } from '../lib/indexCalc'

const MASTER = path.join(process.cwd(), 'public', 'data', 'complexes_master.json')
const data = JSON.parse(fs.readFileSync(MASTER, 'utf-8')) as Record<string, unknown>[]

// JSON(camel) → ReconRow(snake) 매핑
function toRow(d: Record<string, unknown>): ReconRow {
  return {
    id: (d.assetId as string) || (d.ticker as string),
    name: d.name as string, short_name: d.shortName as string, dong: d.dong as string,
    ticker: d.ticker as string, jibun: d.jibun as string, bjdong: d.bjdong as string, gu: d.gu as string,
    eta: d.eta as number, move_in: d.moveIn as number,
    stage: d.stage as number, risk: d.risk as string, eta_provisional: d.etaProvisional as boolean,
    far: d.far as number, plat_area: d.platArea as number,
    households: d.hhldCnt as number, h: d.h as number,
    tot_area: d.totArea as number, vlrat_estm_area: d.vlRatEstmTotArea as number,
    avg_ppp: d.avgPPP as number, latest_price: d.latestPrice as number, latest_area: d.latestArea as number,
    latest_date: d.latestDate as string, trade_count: d.tradeCount as number,
    nvp_final: d.nvpFinal as number, nvp_ref_codes: d.nvpRefCodes as string[],
    nvp_loc_weight: d.nvpLocWeight as number, nvp_valid: d.nvpValid as boolean,
  }
}

const rows = data.map(toRow)
const results = calcAll(rows)

let pass = 0, fail = 0
const mismatches: string[] = []
// 파이썬이 산출한 필드만 비교 (티커 단지)
const recon = data.filter(d => d.ticker && d.cmc && d.far && d.platArea)
for (const d of recon) {
  const id = (d.assetId as string) || (d.ticker as string)
  const c = results.get(id)
  if (!c) { fail++; mismatches.push(`${d.shortName}: 결과 없음`); continue }
  // NCMC 산식 변경(A안)으로 값이 달라진 ncmc/ncmcNewPpp/rar은 회귀 대상에서 제외.
  // 이들은 아래 파트2(케이스 검증)에서 새 기대값으로 확인.
  const checks: [string, unknown, unknown][] = [
    ['cmc', d.cmc, c.cmc],
    ['landPppMarket', d.landPppMarket, c.landPppMarket],
    ['capGrade', d.capGrade, c.capGrade],
    ['ncmcNvpBase', d.ncmcNvpBase, c.ncmcNvpBase],
    ['targetFar', d.targetFar, c.targetFar],
    ['sizeGrade', d.sizeGrade, c.sizeGrade],
    ['tradeReliability', d.tradeReliability, c.tradeReliability],
    ['nvpGapRate', d.nvpGapRate, c.nvpGapRate],
    ['warnDistortion', d.warnDistortion, c.warnDistortion],
    ['latestMonthsAgo', d.latestMonthsAgo, c.latestMonthsAgo],
  ]
  for (const [field, py, ts] of checks) {
    // 숫자는 소수 오차 허용(0.01), 나머지는 정확 비교
    let ok: boolean
    if (typeof py === 'number' && typeof ts === 'number') ok = Math.abs(py - ts) < 0.015
    else ok = py === ts || (py == null && ts == null)
    if (ok) pass++
    else { fail++; mismatches.push(`${d.shortName}.${field}: PY=${py} TS=${ts}`) }
  }
}

console.log(`[파트1 회귀] 파이썬 대조(불변 필드): 통과 ${pass} / 불일치 ${fail} (재건축 ${recon.length}개)`)
if (mismatches.length) {
  console.log('=== 불일치 상세 ===')
  mismatches.slice(0, 60).forEach(m => console.log('  ' + m))
  if (mismatches.length > 60) console.log(`  ... 외 ${mismatches.length - 60}건`)
}

// ── 파트2: NCMC A안(미래상승 제거) 케이스 검증 ──────────────
// 손검증한 실제 케이스. NCMC = 분양전용면적 × 현재NVP (미래 ^eta 없음).
interface Case { name: string; row: ReconRow; expect: { ncmc?: number; rar?: number; newPpp?: number } }
const cases: Case[] = [
  {
    name: '오금현대(정비계획 확정 360%·기부10.2%)',
    row: { ticker: 'OGHD', dong: '오금동', far: 200, plan_confirmed: true, plan_far: 360,
      plan_donation_rate: 0.102, households: 1316, plat_area: 110232,
      latest_price: 195300, latest_area: 84.98, avg_ppp: 8572, nvp_final: 10962, eta: 10 } as unknown as ReconRow,
    expect: { ncmc: 8.86, rar: 3.45, newPpp: 10962 },
  },
  {
    name: '일반단지(대치 180%→300%, 매핑12000)',
    row: { ticker: 'TEST', dong: '대치동', far: 180, households: 1000, plat_area: 50000,
      latest_price: 200000, latest_area: 84, avg_ppp: 9000, nvp_final: 12000, eta: 10 } as unknown as ReconRow,
    expect: { ncmc: 3.27, rar: 1.64, newPpp: 12000 },
  },
]
let cpass = 0, cfail = 0
const cmiss: string[] = []
for (const cs of cases) {
  const c = calcOne(cs.row)
  const chk: [string, number | null, number | undefined][] = [
    ['ncmc', c.ncmc, cs.expect.ncmc],
    ['rar', c.rar, cs.expect.rar],
    ['ncmcNewPpp', c.ncmcNewPpp, cs.expect.newPpp],
  ]
  for (const [f, got, exp] of chk) {
    if (exp == null) continue
    if (got != null && Math.abs(got - exp) < 0.02) cpass++
    else { cfail++; cmiss.push(`${cs.name}.${f}: 기대=${exp} 실제=${got}`) }
  }
}
console.log(`[파트2 케이스] NCMC A안 검증: 통과 ${cpass} / 불일치 ${cfail}`)
cmiss.forEach(m => console.log('  ' + m))

if (fail === 0 && cfail === 0) console.log('\n✅ 전체 통과 — 불변 계산 회귀 OK + NCMC A안 케이스 OK')
else console.log('\n❌ 불일치 있음 — 위 상세 확인')
