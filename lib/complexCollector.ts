// 단지 정보 자동수집 (다중 소스). 검수·자동입력용.
// 소스: 건축물대장(세대·용적·연면적·준공) + 토지대장(대지) + 실거래(시세).
// 계산·조회 로직 일원화 규칙: 여기(lib)에 두고 화면은 호출만.

const BLD_KEY = 'Q5ESFBIwOv0jBJFO74hayYGsfDZH6Xvz70FGVRXojNTmCuxoXtrvBbXpmwBuAMc2mjbjLFjW7llkX3liqloF4A%3D%3D'
const LAND_LAMBDA = 'https://3b77wfcneqfnywtzw3z333kw6a0gtrzt.lambda-url.ap-northeast-2.on.aws/'
const TRADE_LAMBDA = 'https://33bujx6lkx33gqxalne4ufncsy0lchzk.lambda-url.ap-northeast-2.on.aws/'
export const PY = 3.3058

export const LAWD_MAP: Record<string, string> = {
  '강남구': '11680', '서초구': '11650', '송파구': '11710', '강동구': '11740',
  '양천구': '11470', '노원구': '11350', '영등포구': '11560', '마포구': '11440',
  '성동구': '11200', '용산구': '11170', '동작구': '11590', '광진구': '11215',
}

export interface BuildingInfo {
  bjdong: string | null
  aptNm: string | null
  households: number | null
  builtYear: number | null
  far: number | null           // 현재 용적률(%). 대장 vlRat 0이면 vlRatEstm÷대지로 역산.
  totArea: number | null       // 현재 연면적(㎡) 전체
  gfaResi: number | null       // 주거(공동주택) 연면적(㎡)
  gfaComm: number | null       // 비주거(상가·근생·판매 등) 연면적(㎡). 없으면 null
  vlRatEstm: number | null     // 용적률산정 연면적(㎡) — 총괄표제부. 용적률 역산용.
  dongCnt: number | null
}
export interface LandInfo { area: number | null; jimok: string | null }
export interface TradeItem { date: string; area: number; amount: number; floor: string; ppp: number }  // 개별 거래
export interface TradeInfo { count: number; avgPpp: number | null; aptNm: string | null; names: string[]; recent: TradeItem[]; matchBy: 'jibun' | 'name' | null }

// bjdong 후보 순회 → 응답 주소 동명 매칭으로 확정 + 건축물대장 요약
export async function collectBuilding(lawd: string, dong: string, bun: string | number, ji: string | number): Promise<BuildingInfo> {
  const bunP = String(bun).padStart(4, '0'), jiP = String(ji || '0').padStart(4, '0')
  for (let n = 101; n <= 116; n++) {
    const bj = String(n * 100).padStart(5, '0')
    try {
      const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${BLD_KEY}&sigunguCd=${lawd}&bjdongCd=${bj}&bun=${bunP}&ji=${jiP}&numOfRows=50&pageNo=1&_type=json`
      const r = await fetch(url); const d = await r.json()
      const it = d?.response?.body?.items?.item; if (!it) continue
      const items = Array.isArray(it) ? it : [it]
      const addr0 = items[0].platPlc || items[0].newPlatPlc || ''
      if (!addr0.includes(dong)) continue   // 동명 매칭 = bjdong 확정
      const isResi = (x: Record<string, unknown>) => (x.mainPurpsCdNm as string || '') === '공동주택' || /아파트|공동주택|주거/.test(x.etcPurps as string || '')
      const resi = items.filter(isResi)
      const tgt = resi.length ? resi : items
      const households = tgt.reduce((s: number, x: Record<string, unknown>) => s + parseInt(x.hhldCnt as string || '0'), 0) || null
      const dates = tgt.map((x: Record<string, unknown>) => x.useAprDay as string).filter((v: string) => v && v.length >= 4)
      const builtYear = dates.length ? Math.min(...dates.map((v: string) => parseInt(v.substring(0, 4)))) : null
      let far = tgt.map((x: Record<string, unknown>) => parseFloat(x.vlRat as string || '0')).find((v: number) => v > 0) || null
      // 용도별 연면적 (표제부 동별 합산): 주거(공동주택) / 비주거(판매·근린 등)
      const gfaResi = items.filter(isResi).reduce((s: number, x: Record<string, unknown>) => s + parseFloat(x.totArea as string || '0'), 0) || null
      const gfaCommRaw = items.filter((x: Record<string, unknown>) => !isResi(x)).reduce((s: number, x: Record<string, unknown>) => s + parseFloat(x.totArea as string || '0'), 0)
      const gfaComm = gfaCommRaw > 0 ? gfaCommRaw : null   // 비주거 없으면 null(주거만/구분불가)
      let totArea = items.reduce((s: number, x: Record<string, unknown>) => s + parseFloat(x.totArea as string || '0'), 0) || null
      let vlRatEstm: number | null = null
      const aptNm = ((items[0].bldNm as string) || '').replace(/\d+동.*$/, '').trim() || null
      // 총괄표제부 보강: 연면적·용적률산정연면적·용적률 (표제부는 동별이라 부정확할 수 있음)
      try {
        const ru = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${BLD_KEY}&sigunguCd=${lawd}&bjdongCd=${bj}&bun=${bunP}&ji=${jiP}&numOfRows=5&pageNo=1&_type=json`
        const rr = await fetch(ru); const rd = await rr.json()
        let rit = rd?.response?.body?.items?.item
        if (rit) {
          const recap = Array.isArray(rit) ? rit[0] : rit
          const rTot = parseFloat(recap.totArea || '0')
          const rEstm = parseFloat(recap.vlRatEstmTotArea || '0')
          const rFar = parseFloat(recap.vlRat || '0')
          if (rTot > 0) totArea = rTot        // 총괄 연면적 우선(전체 합산)
          if (rEstm > 0) vlRatEstm = rEstm
          if (rFar > 0) far = rFar
        }
      } catch { /* 총괄 없으면 표제부값 유지 */ }
      return { bjdong: bj, aptNm, households, builtYear, far, totArea, gfaResi, gfaComm, vlRatEstm, dongCnt: resi.length || items.length }
    } catch { /* 다음 후보 */ }
  }
  return { bjdong: null, aptNm: null, households: null, builtYear: null, far: null, totArea: null, gfaResi: null, gfaComm: null, vlRatEstm: null, dongCnt: null }
}

export async function collectLand(lawd: string, bjdong: string, bun: string | number, ji: string | number): Promise<LandInfo | null> {
  const bunP = String(bun).padStart(4, '0'), jiP = String(ji || '0').padStart(4, '0')
  const pnu = lawd + bjdong + '1' + bunP + jiP
  try {
    const r = await fetch(`${LAND_LAMBDA}?pnu=${pnu}`); const d = await r.json()
    const it = d?.landCharacteristicss?.field; if (!it || !it.length) return null
    const latest = [...it].sort((a, b) => parseInt(b.stdrYear || 0) - parseInt(a.stdrYear || 0))[0]
    return { area: parseFloat(latest.lndpclAr || 0) || null, jimok: latest.lndcgrCodeNm || null }
  } catch { return null }
}

// 실거래 매칭 규칙 (공통): ① 지번(jibun) 일치 우선 — 단지명이 소스마다 달라도 정확
//                          ② 지번으로 못 잡으면 단지명 근사매칭 폴백
//                          (실패 시 화면에서 후보 목록으로 사용자 선택 — collector UI)
export async function collectTrade(lawd: string, dong: string, aptNm: string | null, jibun?: string | number | null): Promise<TradeInfo | null> {
  const now = new Date(); const jobs: string[] = []
  for (let i = 0; i < 6; i++) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); jobs.push(dt.getFullYear() + String(dt.getMonth() + 1).padStart(2, '0')) }  // 최근 6개월
  const targetJibun = jibun != null ? String(jibun).replace(/^0+/, '') : null  // 앞 0 제거 정규화
  try {
    const xmls = await Promise.all(jobs.map(ym => fetch(`${TRADE_LAMBDA}?LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`).then(r => r.text()).catch(() => '')))
    const items: { apt: string; amt: number; area: number; date: string; floor: string; jibun: string; cancel: boolean }[] = []
    xmls.forEach(xml => {
      (xml.match(/<item>([\s\S]*?)<\/item>/g) || []).forEach(it => {
        const g = (t: string) => { const m = it.match(new RegExp('<' + t + '>(.*?)</' + t + '>')); return m ? m[1].trim() : '' }
        if (g('umdNm') !== dong) return
        const y = g('dealYear'), m = g('dealMonth').padStart(2, '0'), day = g('dealDay').padStart(2, '0')
        items.push({
          apt: g('aptNm'), amt: parseInt((g('dealAmount') || '0').replace(/,/g, '')),
          area: parseFloat(g('excluUseAr') || '0'), date: `${y}.${m}.${day}`, floor: g('floor'),
          jibun: g('jibun').replace(/^0+/, ''), cancel: !!g('cdealType'),  // 지번(앞0제거), 해제거래
        })
      })
    })
    // ① 지번 일치 우선 (이름 무관, 가장 정확)
    let mine = targetJibun ? items.filter(x => x.jibun && x.jibun === targetJibun) : []
    let matchBy: 'jibun' | 'name' | null = mine.length ? 'jibun' : null
    // ② 지번 매칭 실패 시 단지명 근사매칭
    if (!mine.length && aptNm) { mine = items.filter(x => x.apt && (x.apt.includes(aptNm) || aptNm.includes(x.apt))); if (mine.length) matchBy = 'name' }
    mine = mine.filter(x => !x.cancel)
    const names = [...new Set(items.map(x => x.apt))].slice(0, 10)
    if (!mine.length) return { count: 0, avgPpp: null, aptNm, names, recent: [], matchBy: null }
    const valid = mine.filter(x => x.amt > 0 && x.area > 0)
    const ppps = valid.map(x => x.amt / (x.area / PY))
    const avg = ppps.length ? Math.round(ppps.reduce((a, b) => a + b, 0) / ppps.length) : null
    // 최근순 정렬 후 10건
    const recent: TradeItem[] = valid
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map(x => ({ date: x.date, area: x.area, amount: x.amt, floor: x.floor, ppp: Math.round(x.amt / (x.area / PY)) }))
    return { count: mine.length, avgPpp: avg, aptNm, names, recent, matchBy }
  } catch { return null }
}

export interface CollectResult {
  gu: string; dong: string; jibun: string; lawd: string | null
  building: BuildingInfo; land: LandInfo | null; trade: TradeInfo | null
  platAreaEst: number | null   // 연면적÷용적률 역산 (교차검증)
  landCheck: 'ok' | 'warn' | null  // 토지대장 vs 역산 갭
  commercialOnly: boolean      // 상가/근생 단독 필지(주거 세대 0) — 아파트 본체 아님
  farNote: string | null       // 용적률 못 구한 사유 (있으면 표시)
}

// 주소(구·동·지번) → 전체 수집 + 교차검증
export async function collectByAddress(gu: string, dong: string, bun: string | number, ji: string | number): Promise<CollectResult> {
  const jibun = ji && ji !== '0' ? `${bun}-${ji}` : `${bun}`
  const lawd = LAWD_MAP[gu] || null
  if (!lawd) return { gu, dong, jibun, lawd: null, building: { bjdong: null, aptNm: null, households: null, builtYear: null, far: null, totArea: null, gfaResi: null, gfaComm: null, vlRatEstm: null, dongCnt: null }, land: null, trade: null, platAreaEst: null, landCheck: null, commercialOnly: false, farNote: null }
  const building = await collectBuilding(lawd, dong, bun, ji)
  const [land, trade] = await Promise.all([
    building.bjdong ? collectLand(lawd, building.bjdong, bun, ji) : Promise.resolve(null),
    collectTrade(lawd, dong, building.aptNm, bun),   // 지번 우선 매칭 (이름 무관)
  ])
  // 상가/근생 단독 필지 판정: 주거 세대 0 이고 비주거 연면적만 있음 (아파트 본체 아님)
  const commercialOnly = (!building.households || building.households === 0) && !building.gfaResi && !!building.gfaComm
  // 용적률: 대장 vlRat 0이면 ① 용적률산정연면적÷대지 ② (없으면) 연면적÷대지 순으로 역산
  let farNote: string | null = null
  if (building.far == null || building.far === 0) {
    if (building.vlRatEstm && land?.area) {
      building.far = Math.round(building.vlRatEstm / land.area * 100 * 10) / 10
    } else if (building.totArea && land?.area && !commercialOnly) {
      building.far = Math.round(building.totArea / land.area * 100 * 10) / 10
      farNote = '연면적÷대지 역산(근사)'
    } else {
      farNote = commercialOnly ? '상가/부속 필지 — 아파트 본체 클릭 권장' : '용적률 산정불가(대장·대지 데이터 부족)'
    }
  }
  const platAreaEst = (building.totArea && building.far) ? Math.round(building.totArea / (building.far / 100)) : null
  let landCheck: 'ok' | 'warn' | null = null
  if (land?.area && platAreaEst) landCheck = Math.abs(land.area - platAreaEst) / platAreaEst <= 0.10 ? 'ok' : 'warn'
  return { gu, dong, jibun, lawd, building, land, trade, platAreaEst, landCheck, commercialOnly, farNote }
}
