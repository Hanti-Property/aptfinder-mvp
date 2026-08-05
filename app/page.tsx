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

interface Note {
  id: string
  title: string
  category: string
  content: string
  bottom_line: string
  created_at: string
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    async function fetch() {
      const { data: listData } = await supabase
        .from('listings')
        .select('*, listing_images(image_url, is_primary)')
        .eq('status', '거래가능')
        .order('created_at', { ascending: false })
        .limit(10)
      if (listData) setListings(listData)

      const { data: noteData } = await supabase
        .from('research_notes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      if (noteData) setNotes(noteData)
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
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      {/* Header */}
      <header className="bg-[#1B3A5C] text-white p-3 text-center">
        <h1 className="text-3xl font-bold">AptFinder</h1>
      </header>

      {/* Hero - 축소 */}
      <div className="bg-gradient-to-br from-[#1B3A5C] to-[#0d2b45] text-white text-center px-4 py-3 rounded-b-2xl">
        <p className="text-sm opacity-90 mb-0.5">강남 부동산 전문가와 함께하는</p>
        <h2 className="text-xl font-bold mb-2">당신의 투자파트너</h2>
        <div className="bg-white rounded-lg px-3 py-1.5 flex items-center max-w-[70%] mx-auto">
          <input type="text" placeholder="검색" className="flex-1 border-none outline-none text-sm text-gray-800" />
          <span className="text-base">🔍</span>
        </div>
      </div>

      <div className="p-4">
        {/* 베타 안내 */}
        <div className="bg-[#1B3A5C] px-4 py-1.5 -mx-4 mt-2 mb-4 text-center">
          <p className="text-[10px] text-gray-300 whitespace-nowrap">현재 베타 서비스로 운영 중입니다. 정식 서비스는 추후 안내드립니다.</p>
        </div>
        {/* 오늘의 리서치 노트 — DB에서 가져옴 */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold">📋 오늘의 리서치 노트</h3>
            <a href="/notes" className="text-base text-[#1B3A5C] font-semibold">더보기 →</a>
          </div>
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
            {notes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">등록된 노트가 없습니다.</p>
            ) : (
              notes.map(note => (
                <div key={note.id} onClick={() => window.location.href = `/notes/${note.id}`}
                  className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] bg-[#1B3A5C] text-white px-1.5 py-0.5 rounded">{note.category}</span>
                    <span className="text-[10px] text-gray-500">{new Date(note.created_at).toLocaleDateString('ko-KR', {month:'2-digit', day:'2-digit'})}</span>
                  </div>
                  <p style={{color:'#111827'}} className="text-xl font-semibold mb-1">{note.title}</p>
                  <p style={{color:'#374151'}} className="text-base line-clamp-2">{note.content}</p>
                  {note.bottom_line && (
                    <p className="text-sm text-[#C49A3C] mt-2">📌 {note.bottom_line}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 추천 매물 — DB에서 가져온 실제 데이터 */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold">🏠 등록 매물</h3>
            <a href="/listings" className="text-base text-[#1B3A5C] font-semibold">전체보기 →</a>
          </div>

          {listings.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">아직 등록된 매물이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map(l => {
                const img = l.listing_images?.find((i: {is_primary: boolean}) => i.is_primary) || l.listing_images?.[0]
                return (
                <div key={l.id} onClick={() => window.location.href = `/listings/${l.id}`}
                  className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md">
                  {img ? (
                    <img src={img.image_url} alt={l.complex_name} className="w-full h-32 object-cover rounded mb-2" />
                  ) : (
                    <div className="w-full h-32 bg-[#1B3A5C] rounded mb-2 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">AptFinder</span>
                    </div>
                  )}
                  <p style={{color:'#111827'}} className="text-base font-semibold truncate">{l.complex_name} {l.building_no}동</p>
                  <p className="text-sm text-gray-500 mt-0.5">전용 {l.exclusive_area}㎡ · {l.direction}</p>
                  <p className={`text-lg font-bold mt-1 ${getPriceColor(l.transaction_type)}`}>{formatPrice(l)}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(l.created_at).toLocaleDateString('ko-KR', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</p>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 전문가 상담 */}
        <div className="bg-[#1B3A5C] p-4 rounded-lg text-center">
          <p className="text-lg font-semibold text-white mb-2">💬 전문가에게 물어보세요</p>
          <p className="text-base text-gray-300 mb-3">강남 재건축·투자 전문 상담</p>
          <button className="px-8 py-3 bg-white text-[#1B3A5C] rounded-lg text-lg font-semibold">상담 신청하기</button>
          <p className="mt-2"><a href="/experts" className="text-xs text-[#C49A3C]">전문가 네트워크 보기 →</a></p>
        </div>

        {/* 관리자 링크 */}
        <div className="mt-4 text-center">
          <a href="/admin/register" className="text-xs text-gray-400 underline">관리자: 매물 등록</a>
        </div>
      </div>
    </div>
  )
}
