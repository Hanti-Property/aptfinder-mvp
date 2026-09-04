// TS 계산엔진(lib/indexCalc.ts) 결과가 파이썬 계산값(complexes_master.json)과 일치하는지 검증.
// 실행: npx tsc scripts/verify_indexcalc.ts lib/indexCalc.ts --outDir .verify_out --module commonjs --target es2020 --moduleResolution node --esModuleInterop
//       node .verify_out/scripts/verify_indexcalc.js
import * as fs from 'fs'
import * as path from 'path'
import { calcAll, ReconRow } from '../lib/indexCalc'

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
  const checks: [string, unknown, unknown][] = [
    ['cmc', d.cmc, c.cmc],
    ['landPppMarket', d.landPppMarket, c.landPppMarket],
    ['capGrade', d.capGrade, c.capGrade],
    ['ncmc', d.ncmc, c.ncmc],
    ['ncmcNewPpp', d.ncmcNewPpp, c.ncmcNewPpp],
    ['ncmcNvpBase', d.ncmcNvpBase, c.ncmcNvpBase],
    ['rar', d.rar, c.rar],
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

console.log(`검증 결과: 통과 ${pass} / 불일치 ${fail} (재건축 ${recon.length}개)`)
if (mismatches.length) {
  console.log('\n=== 불일치 상세 ===')
  mismatches.slice(0, 60).forEach(m => console.log('  ' + m))
  if (mismatches.length > 60) console.log(`  ... 외 ${mismatches.length - 60}건`)
} else {
  console.log('✅ 전 항목 일치 — TS 엔진 = 파이썬 결과')
}
