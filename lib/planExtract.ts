// 정비계획 문서(recon_docs.body) → 확정값 후보 추출기 (규칙 기반 1차 파서).
// 목적: 반자동 파이프라인. 파서가 후보를 뽑고, 사용자가 검수·승인 후 recon_master에 반영.
// 정확도 생명이라 "여러 후보 + 문맥 힌트"를 제시하고 최종 선택은 사람이 한다.

export interface Candidate {
  value: number       // 파싱된 숫자 (마스터 저장 단위로 정규화됨)
  raw: string         // 원문 조각 (근거 표시용)
  hint?: string       // 문맥 힌트 (예: '통합평균', '획지1', '현재')
}

export interface ExtractField {
  key: string                 // recon_master 컬럼명
  label: string               // 화면 라벨
  unit: string                // 표시 단위
  candidates: Candidate[]     // 후보들 (첫번째가 기본 추천)
  suggested: number | null    // 추천값 (candidates[0]?.value)
}

// 숫자 문자열 → number (콤마 제거, 범위 "98~99"는 중앙값)
function parseNum(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim()
  const range = cleaned.match(/^(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)$/)
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// 특정 정규식으로 매칭되는 모든 후보 수집 (중복 value 제거, 등장순 유지)
function collect(text: string, re: RegExp, transform: (m: RegExpExecArray) => Candidate | null): Candidate[] {
  const out: Candidate[] = []
  const seen = new Set<number>()
  let m: RegExpExecArray | null
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  while ((m = r.exec(text)) !== null) {
    const c = transform(m)
    if (c && !seen.has(c.value)) { seen.add(c.value); out.push(c) }
    if (m.index === r.lastIndex) r.lastIndex++
  }
  return out
}

// 매칭 위치 앞뒤 문맥에서 힌트 추출
function hintOf(text: string, idx: number): string | undefined {
  const around = text.slice(Math.max(0, idx - 25), idx + 5)
  if (/통합|평균|전체/.test(around)) return '통합평균'
  if (/획지\s*1|제3종/.test(around)) return '획지1'
  if (/획지\s*2|준주거/.test(around)) return '획지2'
  if (/현재|기존|재건축\s*전|준공/.test(around)) return '현재/기존'
  if (/신축|재건축\s*후|계획/.test(around)) return '재건축후'
  return undefined
}

export function extractPlanFields(body: string): ExtractField[] {
  const text = (body || '').replace(/\s+/g, ' ')
  const fields: ExtractField[] = []

  const mk = (key: string, label: string, unit: string, cands: Candidate[]): ExtractField => ({
    key, label, unit, candidates: cands, suggested: cands.length ? cands[0].value : null,
  })

  // --- 용적률(%) : 여러 값 나올 수 있음. '통합평균'을 최우선 추천으로 정렬 ---
  const farCands = collect(text, /용적률[^0-9]{0,10}?약?\s*([\d,]+(?:\.\d+)?)\s*%/g, (m) => {
    const v = parseNum(m[1]); if (v == null) return null
    return { value: v, raw: m[0].trim(), hint: hintOf(text, m.index) }
  })
  // "평균 용적률 약 360%" 처럼 용적률이 뒤에 오는 표현도 수집
  const farCands2 = collect(text, /(?:통합|평균)[^0-9]{0,12}?([\d,]+(?:\.\d+)?)\s*%/g, (m) => {
    const v = parseNum(m[1]); if (v == null) return null
    return { value: v, raw: m[0].trim(), hint: '통합평균' }
  })
  const allFar = [...farCands, ...farCands2].filter((c, i, a) => a.findIndex(x => x.value === c.value) === i)
  // 목표 용적률(plan_far): 통합평균 힌트 우선, 없으면 가장 큰 값(고밀 결과)
  const planFarSorted = [...allFar].sort((a, b) => {
    const ap = a.hint === '통합평균' ? 1 : 0, bp = b.hint === '통합평균' ? 1 : 0
    if (ap !== bp) return bp - ap
    return b.value - a.value
  })
  if (planFarSorted.length) fields.push(mk('plan_far', '목표 용적률', '%', planFarSorted))
  // 현재 용적률(far): '현재/기존' 힌트 우선, 없으면 가장 작은 값
  const curFarSorted = [...allFar].sort((a, b) => {
    const ap = a.hint === '현재/기존' ? 1 : 0, bp = b.hint === '현재/기존' ? 1 : 0
    if (ap !== bp) return bp - ap
    return a.value - b.value
  })
  if (curFarSorted.length) fields.push(mk('far', '현재 용적률', '%', curFarSorted))

  // --- 세대수: 재건축후(가장 큰 값) / 임대 ---
  const unitCands = collect(text, /(?:총\s*)?([\d,]{3,})\s*세대/g, (m) => {
    const v = parseNum(m[1]); if (v == null) return null
    return { value: v, raw: m[0].trim(), hint: hintOf(text, m.index) }
  })
  // 임대 세대는 "임대" 문맥
  const rentalCands = collect(text, /임대[^0-9]{0,10}?([\d,]{2,})\s*세대/g, (m) => {
    const v = parseNum(m[1]); if (v == null) return null
    return { value: v, raw: m[0].trim(), hint: '임대' }
  })
  const rentalVals = new Set(rentalCands.map(c => c.value))
  // 재건축후 총세대(plan_units_new): 임대값 제외, 최댓값 우선
  const newUnits = unitCands.filter(c => !rentalVals.has(c.value)).sort((a, b) => b.value - a.value)
  if (newUnits.length) fields.push(mk('plan_units_new', '재건축후 총세대', '세대', newUnits))
  if (rentalCands.length) fields.push(mk('plan_units_rental', '임대 세대', '세대', rentalCands.sort((a, b) => a.value - b.value)))

  // --- 기부채납(%) → 0~1 비율 저장 ---
  const donCands = collect(text, /기부채납[^0-9]{0,10}?약?\s*([\d.]+)\s*%/g, (m) => {
    const v = parseNum(m[1]); if (v == null) return null
    return { value: Math.round(v / 100 * 1000) / 1000, raw: m[0].trim() }  // 10.2% → 0.102
  })
  if (donCands.length) fields.push(mk('plan_donation_rate', '기부채납 비율', '(0~1)', donCands))

  // --- 연면적(㎡) : 재건축후(최댓값) ---
  const gfaCands = collect(text, /연면적[^0-9]{0,10}?약?\s*([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|㎥)?/g, (m) => {
    const v = parseNum(m[1]); if (v == null || v < 10000) return null  // 만㎡ 이상만
    return { value: v, raw: m[0].trim(), hint: hintOf(text, m.index) }
  })
  if (gfaCands.length) fields.push(mk('plan_gfa_new', '재건축후 연면적', '㎡', gfaCands.sort((a, b) => b.value - a.value)))

  // --- 건폐율(%) ---
  const bcrCands = collect(text, /건폐율[^0-9]{0,10}?약?\s*([\d.]+)\s*%/g, (m) => {
    const v = parseNum(m[1]); if (v == null) return null
    return { value: v, raw: m[0].trim() }
  })
  if (bcrCands.length) fields.push(mk('plan_bcr', '건폐율', '%', bcrCands))

  // --- 비례율(%) : 범위면 중앙값 ---
  const ratioCands = collect(text, /비례율[^0-9]{0,10}?약?\s*([\d]+(?:\.\d+)?(?:\s*[~\-]\s*[\d]+(?:\.\d+)?)?)\s*%/g, (m) => {
    const v = parseNum(m[1]); if (v == null) return null
    return { value: Math.round(v * 10) / 10, raw: m[0].trim() }
  })
  if (ratioCands.length) fields.push(mk('plan_ratio', '비례율', '%', ratioCands))

  return fields
}
