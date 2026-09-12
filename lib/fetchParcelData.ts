// ============================================================
// 지번 풀자동조회 — 건축물대장(총괄표제부+표제부) + 토지대장 + 실거래
// 작성일: 2026-09-04
//
// RVI HTML(_internal_rvi.html)의 검증된 조회 로직(fetchRecap/fetchTitle/
// fetchLand/mergeBldData + 용적률 도출)을 TS로 이식. admin 단지 추가 시
// 지번(lawd·bjdong·jibun)만으로 대지면적·용적률·세대수·연면적·현재시세를 자동 수집.
//
// ⚠️ 대장 API는 단지별 정확도 편차가 큼 → 조회 후 반드시 사람이 검증(미리보기).
// ============================================================

const LAMBDA_URL = 'https://33bujx6lkx33gqxalne4ufncsy0lchzk.lambda-url.ap-northeast-2.on.aws/'
const LAND_LAMBDA = 'https://3b77wfcneqfnywtzw3z333kw6a0gtrzt.lambda-url.ap-northeast-2.on.aws/'
const BLD_KEY = 'Q5ESFBIwOv0jBJFO74hayYGsfDZH6Xvz70FGVRXojNTmCuxoXtrvBbXpmwBuAMc2mjbjLFjW7llkX3liqloF4A%3D%3D'
const PY = 3.3058

type BldItem = Record<string, string>

function splitJibun(jibun: string) {
  const parts = (jibun || '').split('-')
  return { bun: (parts[0] || '0').padStart(4, '0'), ji: (parts[1] || '0').padStart(4, '0') }
}

// 총괄표제부 (세대수·연면적·용적률·대지면적) — 다건 시 공동주택·세대수·연면적 우선
async function fetchRecap(lawd: string, bjdong: string, jibun: string): Promise<BldItem | null> {
  const { bun, ji } = splitJibun(jibun)
  const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${BLD_KEY}&sigunguCd=${lawd}&bjdongCd=${bjdong}&bun=${bun}&ji=${ji}&numOfRows=10&pageNo=1&_type=json`
  try {
    const r = await fetch(url); const d = await r.json()
    const it = d.response?.body?.items?.item
    if (!it) return null
    if (!Array.isArray(it)) return it as BldItem
    const apts = it.filter((x: BldItem) => (x.mainPurpsCdNm || '').includes('공동주택'))
    const pool = apts.length ? apts : it
    pool.sort((a: BldItem, b: BldItem) => {
      const hDiff = parseInt(b.hhldCnt || '0') - parseInt(a.hhldCnt || '0')
      if (hDiff !== 0) return hDiff
      return parseFloat(b.totArea || '0') - parseFloat(a.totArea || '0')
    })
    return pool[0] as BldItem
  } catch { return null }
}

// 표제부 (동별) — 총괄에 값 없을 때 합산 보완
async function fetchTitle(lawd: string, bjdong: string, jibun: string): Promise<BldItem[]> {
  const { bun, ji } = splitJibun(jibun)
  const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${BLD_KEY}&sigunguCd=${lawd}&bjdongCd=${bjdong}&bun=${bun}&ji=${ji}&numOfRows=100&pageNo=1&_type=json`
  try {
    const r = await fetch(url); const d = await r.json()
    const it = d.response?.body?.items?.item
    if (!it) return []
    return Array.isArray(it) ? it : [it]
  } catch { return [] }
}

// 토지대장 (대지면적 lndpclAr) — 최신 기준연도
async function fetchLand(lawd: string, bjdong: string, jibun: string): Promise<BldItem | null> {
  const { bun, ji } = splitJibun(jibun)
  const pnu = lawd + bjdong + '1' + bun + ji
  try {
    const r = await fetch(`${LAND_LAMBDA}?pnu=${pnu}`); const d = await r.json()
    const it = d.landCharacteristicss?.field
    if (!it || !it.length) return null
    return [...it].sort((a, b) => parseInt(b.stdrYear || '0') - parseInt(a.stdrYear || '0'))[0]
  } catch { return null }
}

// 총괄표제부 + 표제부 병합 (RVI HTML mergeBldData와 동일)
function mergeBldData(recap: BldItem | null, titleItems: BldItem[]): BldItem {
  const merged: BldItem = recap ? { ...recap } : {}
  if (!titleItems || titleItems.length === 0) return merged
  const residential = titleItems.filter(t => {
    const p = (t.etcPurps || '').trim()
    const m = (t.mainPurpsCdNm || '')
    return m.includes('공동주택') || m.includes('아파트') || p.includes('아파트') || p.includes('주택')
  })
  const targets = residential.length ? residential : titleItems
  const setSum = (key: string) => {
    if (!merged[key] || parseFloat(merged[key]) === 0) {
      const total = targets.reduce((s, t) => s + parseFloat(t[key] || '0'), 0)
      if (total > 0) merged[key] = String(total)
    }
  }
  const setFirst = (key: string) => {
    if (!merged[key] || parseFloat(merged[key]) === 0) {
      const v = targets.find(t => t[key] && parseFloat(t[key]) > 0)
      if (v) merged[key] = v[key]
    }
  }
  // 세대수 합산
  if (!merged.hhldCnt || parseInt(merged.hhldCnt) === 0) {
    const total = targets.reduce((s, t) => s + parseInt(t.hhldCnt || '0'), 0)
    if (total > 0) merged.hhldCnt = String(total)
  }
  setFirst('vlRat'); setSum('totArea'); setSum('vlRatEstmTotArea')
  setSum('archArea'); setFirst('bcRat'); setFirst('platArea')
  return merged
}

// 실거래 12개월 (84㎡ 우선 평당가) — recon/nvp 화면 calcCurrent와 동일 로직
type Trade = { aptNm: string; excluUseAr: string; dealAmount: string; floor: string; cdealType: string; dealYear: string; dealMonth: string; jibun: string; umdNm: string }
function removeOutliers(v: number[]): number[] {
  if (v.length < 4) return v
  const s = [...v].sort((a, b) => a - b)
  const q1 = s[Math.floor(s.length * .25)], q3 = s[Math.floor(s.length * .75)], iqr = q3 - q1
  return v.filter(x => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr)
}
async function fetchTrades(lawd: string, months: number): Promise<Trade[]> {
  const now = new Date(); const jobs: Promise<Trade[]>[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0')
    jobs.push(fetch(`${LAMBDA_URL}?LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`).then(r => r.text()).then(xml => {
      const doc = new DOMParser().parseFromString(xml, 'text/xml'); const items: Trade[] = []
      doc.querySelectorAll('item').forEach(el => { const o: Record<string, string> = {}; el.childNodes.forEach(n => { if (n.nodeType === 1) o[n.nodeName] = (n.textContent || '').trim() }); items.push(o as unknown as Trade) })
      return items
    }).catch(() => []))
  }
  return (await Promise.all(jobs)).flat()
}
function calcTrade(trades: Trade[], dong: string, jibun: string, tradeNames: string[]) {
  let mine = trades.filter(t => (t.umdNm || '').trim() === dong && tradeNames.some(k => k && (t.aptNm || '').includes(k)) && parseInt(t.floor || '0') > 1 && !(t.cdealType && t.cdealType.trim()))
  if (!mine.length && jibun) mine = trades.filter(t => (t.jibun || '').trim() === jibun && parseInt(t.floor || '0') > 1)
  if (!mine.length) return null
  let pool = mine.filter(t => { const a = parseFloat(t.excluUseAr || '0'); return a >= 76 && a <= 90 })
  if (!pool.length) { const s = [...mine].filter(t => parseFloat(t.excluUseAr || '0') > 0).sort((a, b) => Math.abs(parseFloat(a.excluUseAr) - 84) - Math.abs(parseFloat(b.excluUseAr) - 84)); if (!s.length) return null; const near = parseFloat(s[0].excluUseAr); pool = mine.filter(t => Math.abs(parseFloat(t.excluUseAr || '0') - near) < 3) }
  let ppps = pool.map(t => { const a = parseInt((t.dealAmount || '0').replace(/,/g, '')), ar = parseFloat(t.excluUseAr || '0'); return ar > 0 ? a / (ar / PY) : 0 }).filter(v => v > 0)
  ppps = removeOutliers(ppps); if (!ppps.length) return null
  const avgPy = Math.round(ppps.reduce((a, b) => a + b, 0) / ppps.length)
  const last = pool.sort((a, b) => (`${b.dealYear}${b.dealMonth}`).localeCompare(`${a.dealYear}${a.dealMonth}`))[0]
  const price = Math.round(parseInt((last.dealAmount || '0').replace(/,/g, '')))
  const dates = pool.map(t => `${t.dealYear}.${String(t.dealMonth).padStart(2, '0')}`).sort()
  return { avgPy, price, area: parseFloat(last.excluUseAr), floor: parseInt(last.floor || '0'), count: pool.length, latest: dates[dates.length - 1] }
}

// ── 결과 타입 ──────────────────────────────────────────────
export interface ParcelResult {
  // 원천 (recon_master 컬럼명 = snake_case)
  plat_area: number | null
  far: number | null
  households: number | null
  tot_area: number | null
  vlrat_estm_area: number | null
  avg_ppp: number | null
  latest_price: number | null
  latest_area: number | null
  latest_date: string | null
  trade_count: number | null
  // 진단 (검증용)
  sources: { recap: boolean; land: boolean; title: number; trade: boolean }
  farRule: string
  warnings: string[]
  platPlc: string | null   // 대장이 반환한 지번주소 (예: "서울특별시 송파구 오금동 43") — 입력 동과 대조용
  estPlatArea: number | null // 연면적÷용적률 역산 대지면적(다필지 추정) — 토지대장값과 갭 클 때 참고
}

/**
 * 지번 하나로 대지면적·용적률·세대수·연면적·현재시세를 자동 수집.
 * @param tradeNames 실거래 aptNm 매칭 키워드(약칭/단지명). 비면 지번 매칭.
 */
export async function fetchParcelData(
  lawd: string, bjdong: string, jibun: string, dong: string, tradeNames: string[] = []
): Promise<ParcelResult> {
  const warnings: string[] = []
  const [recap, land, title, trades] = await Promise.all([
    fetchRecap(lawd, bjdong, jibun),
    fetchLand(lawd, bjdong, jibun),
    fetchTitle(lawd, bjdong, jibun),
    fetchTrades(lawd, 12),
  ])
  const merged = mergeBldData(recap, title)

  const households = parseInt(merged.hhldCnt || '0') || null
  const totArea = parseFloat(merged.totArea || '0') || null
  const vlRatEstm = parseFloat(merged.vlRatEstmTotArea || '0') || null
  const archArea = parseFloat(merged.archArea || '0')
  const bcRat = parseFloat(merged.bcRat || '0')
  let platArea = land ? parseFloat(land.lndpclAr || '0') : 0
  if (!platArea) platArea = parseFloat(merged.platArea || '0')

  // 용적률 도출 (RVI HTML과 동일 우선순위)
  let far = 0; let farRule = ''
  if (recap?.vlRat && parseFloat(recap.vlRat) > 0) { far = parseFloat(recap.vlRat); farRule = '대장 vlRat' }
  else if (platArea > 0 && vlRatEstm) { far = (vlRatEstm / platArea) * 100; farRule = 'vlRatEstm/platArea' }
  else if (archArea > 0 && bcRat > 0 && vlRatEstm) { const est = (archArea / bcRat) * 100; far = (vlRatEstm / est) * 100; if (!platArea) platArea = est; farRule = '건폐율역산' }
  else if (platArea > 0 && totArea) { far = (totArea / platArea) * 100; farRule = 'totArea/platArea' }
  if (far > 0 && (far < 50 || far > 500)) { warnings.push(`용적률 ${far.toFixed(0)}% 비정상(50~500% 밖) → 무시`); far = 0 }

  if (!platArea) warnings.push('대지면적 미확보 — 수동 입력 필요')
  if (!far) warnings.push('용적률 미확보 — 수동 입력 필요')
  if (!households) warnings.push('세대수 미확보 — 수동 입력 필요')

  // [다필지 감지] 토지대장 대지면적 vs 연면적÷용적률 역산값 비교.
  // 다필지 단지는 토지대장이 대표지번 한 필지만 반환 → 역산값보다 크게 작음.
  // 두 값 갭 10% 이상이면 경고 + 역산 추정값 제안.
  let estPlatArea: number | null = null
  if (vlRatEstm && far > 0) {
    estPlatArea = Math.round(vlRatEstm / (far / 100))   // 연면적 ÷ 용적률 = 추정 대지면적(총량 기반)
    if (platArea > 0) {
      const gap = Math.abs(platArea - estPlatArea) / estPlatArea
      if (gap >= 0.10) {
        warnings.push(`⚠️ 대지면적 갭 ${(gap * 100).toFixed(0)}% — 토지대장 ${Math.round(platArea).toLocaleString()}㎡ vs 연면적역산 ${estPlatArea.toLocaleString()}㎡. 다필지 단지 가능성 → 정비구역 실면적 확인 권장`)
      }
    }
  }

  const tr = calcTrade(trades, dong, jibun, tradeNames.length ? tradeNames : [])
  if (!tr) warnings.push('실거래 미확보 — 실거래명(trade_name) 확인 필요')

  // 대장 지번주소 (입력 동과 대조용). recap 우선, 없으면 title 첫 항목.
  const platPlc = (recap?.platPlc || (title[0] && title[0].platPlc) || '').trim() || null
  if (platPlc && dong && !platPlc.includes(dong)) {
    warnings.push(`⚠️ 대장 주소(${platPlc})가 입력 동(${dong})과 다름 — 법정동코드(bjdong) 확인 필요`)
  }

  return {
    plat_area: platArea ? Math.round(platArea * 100) / 100 : null,
    far: far ? Math.round(far * 100) / 100 : null,
    households,
    tot_area: totArea,
    vlrat_estm_area: vlRatEstm,
    avg_ppp: tr?.avgPy ?? null,
    latest_price: tr?.price ?? null,
    latest_area: tr?.area ?? null,
    latest_date: tr?.latest ?? null,
    trade_count: tr?.count ?? null,
    sources: { recap: !!recap, land: !!land, title: title.length, trade: !!tr },
    farRule,
    warnings,
    platPlc,
    estPlatArea,
  }
}
