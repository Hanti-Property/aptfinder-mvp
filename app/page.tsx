'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Listing {
  id: string
  complex_name: string
  building_no: string
  unit_no: string
  exclusive_area: number
  room_count: number
  direction: string
  transaction_type: string
  sale_price: number
  deposit: number
  monthly_rent: number
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('status', '거래가능')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setListings(data)
    }
    fetch()
  }, [])

  function formatPrice(l: Listing) {
    if (l.transaction_type === '매매' && l.sale_price) {
      const a = Math.floor(l.sale_price / 10000)
      const b = l.sale_price % 10000
      return `매매 ${a}억${b ? ` ${b.toLocaleString()}만` : ''}`
    }
    if (l.transaction_type === '전세' && l.deposit) {
      const a = Math.floor(l.deposit / 10000)
      return `전세 ${a}억`
    }
    if (l.transaction_type === '월세') {
      const a = l.deposit ? Math.floor(l.deposit / 10000) : 0
      return `${a}억/월${l.monthly_rent}만`
    }
    return ''
  }

  function getPriceColor(type: string) {
    if (type === '매매') return 'text-red-600'
    if (type === '전세') return 'text-green-600'
    return 'text-orange-500'
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">AptFinder</h1>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1B3A5C] to-[#0d2b45] text-white text-center px-4 py-8 rounded-b-2xl">
        <p className="text-sm opacity-90 mb-1">강남 부동산 전문가와 함께하는</p>
        <h2 className="text-xl font-bold mb-4">당신의 투자파트너</h2>
        <div className="bg-white rounded-lg px-3 py-2 flex items-center">
          <input type="text" placeholder="검색" className="flex-1 border-none outline-none text-sm text-gray-800" />
          <span className="text-lg">🔍</span>
        </div>
      </div>

      <div className="p-4">
        {/* 오늘의 리서치 노트 */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">📋 오늘의 리서치 노트</h3>
            <a href="/notes" className="text-xs text-[#1B3A5C]">더보기 →</a>
          </div>
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
            <div className="p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded">재건축</span>
                <span className="text-[10px] text-gray-500">08.02</span>
              </div>
              <p className="text-xs text-gray-800 mb-0.5">은마 76㎡ 분담금</p>
              <p className="text-lg font-bold text-red-600">3.2억 → 3.8억 <span className="text-xs text-gray-500">(+6천만/8개월)</span></p>
              <p className="text-xs text-[#C49A3C] mt-1">📌 분담금 확정 전 추가 상승 가능</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-[#1B3A5C] rounded-full flex items-center justify-center text-white text-xs font-bold">홍</div>
                <span className="text-xs font-semibold">홍성욱의 현장 한마디</span>
                <span className="text-[9px] text-gray-400">08.02</span>
              </div>
              <p className="text-sm text-gray-800">&ldquo;이번 주 은마 매수 문의가 체감상 30% 늘었습니다.&rdquo;</p>
              <p className="text-xs text-[#C49A3C] mt-1">📌 문의 증가 ≠ 거래 증가. 실거래 전환 지켜볼 것</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg border-l-4 border-l-purple-700">
              <p className="text-xs text-purple-700 font-semibold mb-1">Q. 자주 묻는 질문</p>
              <p className="text-sm font-semibold text-gray-800 mb-1">&ldquo;은마 재건축, 지금 사도 될까요?&rdquo;</p>
              <p className="text-xs text-gray-600">사업시행인가 단계. 총 투자비 32억 수준.</p>
              <p className="text-xs text-[#C49A3C] mt-1">📌 32억 이하 진입이면 장기적으로 유효</p>
            </div>
          </div>
        </div>

        {/* 추천 매물 — DB에서 가져온 실제 데이터 */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">🏠 등록 매물</h3>
            <a href="/listings" className="text-xs text-[#1B3A5C]">전체보기 →</a>
          </div>

          {listings.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">아직 등록된 매물이 없습니다.</p>
          ) : (
            <div className="grid grid-rows-2 grid-flow-col auto-cols-[130px] gap-2 overflow-x-auto pb-2">
              {listings.map(l => (
                <div key={l.id} className="border border-gray-200 rounded-lg p-2 cursor-pointer hover:shadow-sm">
                  <div className="w-full h-14 bg-gray-300 rounded mb-1"></div>
                  <p className="text-xs font-semibold truncate">{l.complex_name} {l.building_no}동</p>
                  <p className="text-[10px] text-gray-500">{l.exclusive_area}㎡ · {l.direction}</p>
                  <p className={`text-xs font-bold ${getPriceColor(l.transaction_type)}`}>{formatPrice(l)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 전문가 상담 */}
        <div className="bg-[#1B3A5C] p-4 rounded-lg text-center">
          <p className="text-sm font-semibold text-white mb-1">💬 전문가에게 물어보세요</p>
          <p className="text-xs text-gray-300 mb-3">강남 재건축·투자 전문 상담</p>
          <button className="px-6 py-2 bg-white text-[#1B3A5C] rounded-lg text-sm font-semibold">상담 신청하기</button>
          <p className="mt-2"><a href="#" className="text-xs text-[#C49A3C]">전문가 네트워크 보기 →</a></p>
        </div>

        {/* 관리자 링크 */}
        <div className="mt-4 text-center">
          <a href="/admin/register" className="text-xs text-gray-400 underline">관리자: 매물 등록</a>
        </div>
      </div>
    </div>
  )
}
