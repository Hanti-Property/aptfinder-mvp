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
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'V-World API 호출 실패' }, { status: 500 })
  }
}
