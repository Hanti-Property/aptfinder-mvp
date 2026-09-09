import { NextRequest, NextResponse } from 'next/server'

// V-World 건물 공간정보(WFS lt_c_bldginfo) 프록시
// building_extractor.html 이 ?bbox=서남경도,서남위도,동북경도,동북위도&maxFeatures=N 로 호출
export async function GET(request: NextRequest) {
  const bbox = request.nextUrl.searchParams.get('bbox')
  const maxFeatures = request.nextUrl.searchParams.get('maxFeatures') || '500'

  if (!bbox) {
    return NextResponse.json({ error: 'bbox 파라미터가 필요합니다' }, { status: 400 })
  }

  const key = '97DD838E-CAEE-382F-A158-79AB81275A03'
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    REQUEST: 'GetFeature',
    TYPENAME: 'lt_c_bldginfo',
    BBOX: bbox,
    VERSION: '1.1.0',
    MAXFEATURES: maxFeatures,
    SRSNAME: 'EPSG:4326',
    OUTPUT: 'application/json',
    EXCEPTIONS: 'text/xml',
    KEY: key,
    DOMAIN: 'aptfinder.net',
  })
  const url = 'https://api.vworld.kr/req/wfs?' + params.toString()

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    const text = await response.text()
    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      return NextResponse.json({ error: 'V-World WFS JSON 파싱 실패', raw: text.slice(0, 500) }, { status: 502 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'V-World WFS 호출 실패', detail: error.message }, { status: 500 })
  }
}
