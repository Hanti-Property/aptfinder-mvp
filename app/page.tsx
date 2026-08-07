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
  const [searchQuery, setSearchQuery] = useState('')
  const [fontSize, setFontSize] = useState<'small'|'medium'|'large'>('medium')

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

  const fontClass = fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base'

  return (
    <div className={`min-h-screen bg-gray-50 max-w-2xl mx-auto pb-14 ${fontClass}`}>
      {/* Header */}
      <header className="bg-[#1B3A5C] text-white p-3 text-center">
        <h1 className="text-3xl font-bold">AptFinder</h1>
      </header>

      {/* Hero - 축소 */}
      <div className="bg-gradient-to-br from-[#1B3A5C] to-[#0d2b45] text-white text-center px-4 py-3 rounded-b-2xl">
        <p className="text-sm opacity-90 mb-0.5">강남 부동산 전문가와 함께하는</p>
        <h2 className="text-xl font-bold mb-2">당신의 투자파트너</h2>
        <div className="bg-white rounded-lg px-3 py-1.5 flex items-center max-w-[70%] mx-auto">
          <input type="text" placeholder="단지명 검색" className="flex-1 border-none outline-none text-sm text-gray-800"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}` }} />
          <span className="text-base cursor-pointer"
            onClick={() => { if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}` }}>🔍</span>
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

        {/* === 매물 섹션 숨김 (베타 기간 동안) === */}
        {/* 복귀 시 이 주석 블록을 제거하면 됩니다
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
                    <img src={img.image_url} alt={l.complex_name} className="w-full aspect-[4/3] object-cover rounded mb-2" />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-[#1B3A5C] rounded mb-2 flex items-center justify-center">
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
        끝: 매물 섹션 숨김 */}

        {/* 전문가 칼럼 섹션 */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold">🎓 전문가 칼럼</h3>
            <a href="/columns" className="text-base text-[#1B3A5C] font-semibold">더보기 →</a>
          </div>
          <div className="space-y-3">
            {[
              { color: '#C49A3C', title: '강남 재건축 투자 가이드', desc: '은마·미도·압구정 재건축 단지별 사업 진행 현황과 투자 판단 기준을 분석합니다.' },
              { color: '#7b1fa2', title: '강남 아파트 세무 전략', desc: '양도세·증여세·상속세 절세 타이밍과 실전 사례를 세무 전문가가 분석합니다.' },
              { color: '#1B3A5C', title: '대치동 학군 리포트', desc: '대치동 학군 배정, 학원가 동향, 학부모 선호도 변화를 정기 분석합니다.' },
              { color: '#e53935', title: '강남아파트 시장 전망', desc: '금리·정책·수급 데이터로 강남 아파트 시장의 단기·중기 전망을 제시합니다.' },
              { color: '#00897b', title: '강남 아파트 단지별 리포트', desc: '주요 단지의 시세 흐름, 거래량, 투자 매력도를 비교 분석합니다.' },
            ].map((item, i) => (
              <div key={i} onClick={() => window.location.href = '/notes'} className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50" style={{borderLeftWidth:'4px', borderLeftColor: item.color}}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white px-2 py-0.5 rounded" style={{backgroundColor: item.color}}>전문가칼럼</span>
                  <span className="text-xs text-gray-400">연재중</span>
                </div>
                <p style={{color:'#111827'}} className="text-lg font-bold mb-1">{item.title}</p>
                <p style={{color:'#374151'}} className="text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
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
          <a href="/admin" className="text-xs text-gray-400 underline">관리자</a>
        </div>
      </div>

      {/* 하단 고정 폰트 크기 조절 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 flex justify-center gap-3 max-w-2xl mx-auto">
        <button onClick={() => setFontSize('small')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold border ${fontSize==='small' ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}>
          가 작게
        </button>
        <button onClick={() => setFontSize('medium')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold border ${fontSize==='medium' ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}>
          가 보통
        </button>
        <button onClick={() => setFontSize('large')}
          className={`px-4 py-1.5 rounded-lg text-base font-semibold border ${fontSize==='large' ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}>
          가 크게
        </button>
      </div>
    </div>
  )
}
