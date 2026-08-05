'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Listing {
  id: string
  complex_name: string
  building_no: string
  unit_no: string
  exclusive_area: number
  room_count: number
  direction: string
  floor: number
  transaction_type: string
  sale_price: number
  deposit: number
  monthly_rent: number
  status: string
  created_at: string
  complexes?: { dong: string }
}

function ListingsContent() {
  const searchParams = useSearchParams()
  const queryParam = searchParams.get('q') || ''
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterDong, setFilterDong] = useState('')
  const [filterTime, setFilterTime] = useState('')
  const [searchText, setSearchText] = useState(queryParam)

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from('listings')
        .select('*, complexes(dong), listing_images(image_url, is_primary)')
        .order('created_at', { ascending: false })
      if (data) setListings(data)
      setLoading(false)
    }
    fetchListings()
  }, [])

  function getTimeFilter(item: Listing) {
    if (!filterTime) return true
    const created = new Date(item.created_at)
    const now = new Date()
    if (filterTime === 'today') {
      return created.toDateString() === now.toDateString()
    }
    if (filterTime === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return created >= weekAgo
    }
    if (filterTime === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return created >= monthAgo
    }
    return true
  }

  const filtered = listings
    .filter(l => !filterType || l.transaction_type === filterType)
    .filter(l => !filterDong || l.complexes?.dong === filterDong)
    .filter(l => !searchText || l.complex_name?.toLowerCase().includes(searchText.toLowerCase()))
    .filter(getTimeFilter)

  const dongs = [...new Set(listings.map(l => l.complexes?.dong).filter(Boolean))]

  function formatPrice(l: Listing) {
    if (l.transaction_type === '매매' && l.sale_price) {
      const a = Math.floor(l.sale_price / 10000)
      const b = l.sale_price % 10000
      return `${a}억${b ? ` ${b.toLocaleString()}만` : ''}`
    }
    if (l.transaction_type === '전세' && l.deposit) {
      const a = Math.floor(l.deposit / 10000)
      return `보증금 ${a}억`
    }
    if (l.transaction_type === '월세') {
      const a = l.deposit ? Math.floor(l.deposit / 10000) : 0
      return `${a}억 / 월 ${l.monthly_rent}만`
    }
    return ''
  }

  function formatTime(t: string) {
    const d = new Date(t)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return '방금'
    if (diff < 60) return `${diff}분 전`
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`
    if (diff < 10080) return `${Math.floor(diff / 1440)}일 전`
    return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
  }

  function getBadgeColor(type: string) {
    if (type === '매매') return 'bg-[#1B3A5C]'
    if (type === '전세') return 'bg-green-600'
    return 'bg-orange-500'
  }

  function getPriceColor(type: string) {
    if (type === '매매') return 'text-red-600'
    if (type === '전세') return 'text-green-600'
    return 'text-orange-500'
  }

  if (loading) return <div className="p-4 text-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-xl font-semibold">매물 목록</h1>
      </header>

      <div className="p-4">
        {/* 거래종류 필터 */}
        <div className="flex gap-2 mb-3">
          {['', '매매', '전세', '월세'].map(t => (
            <button key={t}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border
                ${filterType === t ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setFilterType(t)}
            >{t || '전체'}</button>
          ))}
        </div>

        {/* 동 + 시간 필터 */}
        <div className="flex gap-2 mb-4">
          <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
            value={filterDong} onChange={e => setFilterDong(e.target.value)}>
            <option value="">전체 지역</option>
            {dongs.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
            value={filterTime} onChange={e => setFilterTime(e.target.value)}>
            <option value="">전체 기간</option>
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
          </select>
        </div>

        {/* 결과 수 */}
        <p className="text-sm text-gray-500 mb-3">{filtered.length}개 매물</p>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">조건에 맞는 매물이 없습니다.</p>
        ) : (
          filtered.map(l => {
            const img = l.listing_images?.find((i: {is_primary: boolean}) => i.is_primary) || l.listing_images?.[0]
            return (
            <div key={l.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg mb-2 cursor-pointer hover:bg-gray-50"
              onClick={() => window.location.href = `/listings/${l.id}`}>
              {img ? (
                <img src={img.image_url} alt={l.complex_name} className="w-24 h-20 object-cover rounded-md flex-shrink-0" />
              ) : (
                <div className="w-24 h-20 bg-[#1B3A5C] rounded-md flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">AptFinder</span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <strong style={{color:'#111827'}} className="text-base">{l.complex_name} {l.building_no}동</strong>
                  <span className={`text-[10px] text-white px-1.5 py-0.5 rounded ${getBadgeColor(l.transaction_type)}`}>
                    {l.transaction_type}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {l.exclusive_area}㎡ · {l.room_count}방 · {l.direction} · {l.floor}층
                </p>
                <div className="flex justify-between items-center mt-1">
                  <p className={`text-base font-bold ${getPriceColor(l.transaction_type)}`}>
                    {formatPrice(l)}
                  </p>
                  <span className="text-xs text-gray-400">{formatTime(l.created_at)}</span>
                </div>
              </div>
            </div>
            )
          })
        )}

        <a href="/admin/register"
          className="block w-full p-3 bg-[#1B3A5C] text-white text-center rounded-lg font-semibold mt-4 text-base">
          + 새 매물 등록
        </a>
        <a href="/" className="block text-center text-sm text-gray-500 underline mt-3">← 홈으로</a>
      </div>
    </div>
  )
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">로딩 중...</div>}>
      <ListingsContent />
    </Suspense>
  )
}