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
  suggested: number | null    // 추천값 (candidates[0]?.value). 텍스트 필드면 null.
  isText?: boolean            // true면 텍스트 필드 (시공사 등). suggestedText 사용.
  suggestedText?: string      // 텍스트 추천값 (isText일 때)
  raw?: string                // 근거 원문 (텍스트 필드용)
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

  // --- 연면적(㎡) : 재건축후(최댓값) / 현재(최솟값 또는 '현재' 힌트) ---
  const gfaCands = collect(text, /연면적[^0-9]{0,10}?약?\s*([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|㎥)?/g, (m) => {
    const v = parseNum(m[1]); if (v == null || v < 10000) return null  // 만㎡ 이상만
    return { value: v, raw: m[0].trim(), hint: hintOf(text, m.index) }
  })
  if (gfaCands.length) {
    // 재건축후: '재건축후' 힌트 우선, 없으면 최댓값
    const gfaNew = [...gfaCands].sort((a, b) => {
      const ap = a.hint === '재건축후' ? 1 : 0, bp = b.hint === '재건축후' ? 1 : 0
      if (ap !== bp) return bp - ap
      return b.value - a.value
    })
    fields.push(mk('plan_gfa_new', '재건축후 연면적', '㎡', gfaNew))
    // 현재: '현재/기존' 힌트 우선, 없으면 최솟값. 값이 2개 이상일 때만 제안.
    if (gfaCands.length > 1) {
      const gfaCur = [...gfaCands].sort((a, b) => {
        const ap = a.hint === '현재/기존' ? 1 : 0, bp = b.hint === '현재/기존' ? 1 : 0
        if (ap !== bp) return bp - ap
        return a.value - b.value
      })
      fields.push(mk('gfa_current', '현재 연면적', '㎡', gfaCur))
    }
  }

  // --- 정비기반시설 면적(㎡) ---
  const infraCands = collect(text, /정비기반시설[^0-9]{0,10}?약?\s*([\d,]+(?:\.\d+)?)\s*(?:㎡|m2)?/g, (m) => {
    const v = parseNum(m[1]); if (v == null || v < 100) return null
    return { value: v, raw: m[0].trim() }
  })
  if (infraCands.length) fields.push(mk('plan_infra_area', '정비기반시설 면적', '㎡', infraCands))

  // --- 최고 층수 : "지상 37층" 등 ---
  const floorCands = collect(text, /지상\s*([\d]{1,2})\s*층/g, (m) => {
    const v = parseNum(m[1]); if (v == null || v < 5) return null
    return { value: v, raw: m[0].trim() }
  })
  if (floorCands.length) fields.push(mk('plan_max_floor', '최고 층수', '층', floorCands.sort((a, b) => b.value - a.value)))

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

  // --- 준공연도 : "1986년 준공" / "준공: 1986" / "1986년 12월" (1970~2010 범위) ---
  const yearCands = collect(text, /(19[7-9]\d|20[0-2]\d)\s*년?\s*(?:\d{1,2}\s*월)?\s*(?:준공|사용승인|입주)/g, (m) => {
    const v = parseNum(m[1]); if (v == null || v < 1970 || v > 2010) return null
    return { value: v, raw: m[0].trim() }
  })
  // "준공: 1986" 처럼 준공이 앞에 오는 경우도
  const yearCands2 = collect(text, /(?:준공|사용승인)[^0-9]{0,6}?(19[7-9]\d|20[0-2]\d)/g, (m) => {
    const v = parseNum(m[1]); if (v == null || v < 1970 || v > 2010) return null
    return { value: v, raw: m[0].trim() }
  })
  const allYear = [...yearCands, ...yearCands2].filter((c, i, a) => a.findIndex(x => x.value === c.value) === i)
  if (allYear.length) fields.push(mk('built_year', '준공연도', '년', allYear.sort((a, b) => a.value - b.value)))

  // 참고: 84형 분담금(plan_contrib_84)은 파서 자동추출 제외.
  //  이유: 문서 서술이 "신축 15.4억, 6천만~8.4억 납부"처럼 분양가+분담금 혼재 + 천만/억 단위혼용 + 범위라
  //        정규식 오판 위험이 큼(잘못 잡으면 UPI 왜곡). 수동 입력/검수 유지가 정확.

  // --- 시공사 (텍스트) : "시공사: 현대건설" / "시공사 현대건설·GS건설" ---
  const builderM = text.match(/시공사\s*[:：]?\s*([가-힣A-Za-z0-9·,\/\s]{2,30}?)(?:\s|$|\.|,(?=\s*[가-힣]{2,}\s*[:：]))/)
  if (builderM) {
    const b = builderM[1].trim().replace(/\s+/g, ' ')
    if (b && b.length >= 2 && b.length <= 30) {
      fields.push({ key: 'builder', label: '시공사', unit: '', candidates: [], suggested: null, isText: true, suggestedText: b, raw: builderM[0].trim() })
    }
  }

  return fields
}
