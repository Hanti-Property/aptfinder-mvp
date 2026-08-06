import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const pnu = request.nextUrl.searchParams.get('pnu')
  
  if (!pnu) {
    return NextResponse.json({ error: 'pnu 파라미터가 필요합니다' }, { status: 400 })
  }

  const key = '97D0838E-CAEE-382F-A158-79AB81275A03'
  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${key}&attrFilter=pnu:=:${pnu}&type=json`

  try {
    const response = await fetch(url)
    const text = await response.text()
    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: 'JSON 파싱 실패', raw: text }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'V-World API 호출 실패', detail: error.message }, { status: 500 })
  }
}
