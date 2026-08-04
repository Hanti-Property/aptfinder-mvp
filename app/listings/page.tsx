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
  floor: number
  transaction_type: string
  sale_price: number
  deposit: number
  monthly_rent: number
  status: string
  description: string
  created_at: string
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setListings(data)
      setLoading(false)
    }
    fetchListings()
  }, [])

  const filtered = filter
    ? listings.filter(l => l.transaction_type === filter)
    : listings

  function formatPrice(l: Listing) {
    if (l.transaction_type === '매매' && l.sale_price) {
      const a = Math.floor(l.sale_price / 10000)
      const b = l.sale_price % 10000
      return `${a}억${b ? ` ${b.toLocaleString()}만` : ''}`
    }
    if (l.transaction_type === '전세' && l.deposit) {
      const a = Math.floor(l.deposit / 10000)
      const b = l.deposit % 10000
      return `보증금 ${a}억${b ? ` ${b.toLocaleString()}만` : ''}`
    }
    if (l.transaction_type === '월세') {
      const a = l.deposit ? Math.floor(l.deposit / 10000) : 0
      return `${a}억 / 월 ${l.monthly_rent}만`
    }
    return ''
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
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">매물 목록</h1>
      </header>

      <div className="p-4">
        {/* 필터 */}
        <div className="flex gap-2 mb-4">
          {['', '매매', '전세', '월세'].map(t => (
            <button key={t}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border
                ${filter === t ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]' : 'bg-white text-gray-600 border-gray-300'}`}
              onClick={() => setFilter(t)}
            >{t || '전체'}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">등록된 매물이 없습니다.</p>
        ) : (
          filtered.map(l => (
            <div key={l.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg mb-2">
              <div className="w-20 h-16 bg-gray-300 rounded-md flex-shrink-0"></div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <strong className="text-sm">{l.complex_name} {l.building_no}동 {l.unit_no}호</strong>
                  <span className={`text-[9px] text-white px-1.5 py-0.5 rounded ${getBadgeColor(l.transaction_type)}`}>
                    {l.transaction_type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {l.exclusive_area}㎡ · {l.room_count}방 · {l.direction} · {l.floor}층
                </p>
                <p className={`text-sm font-bold mt-0.5 ${getPriceColor(l.transaction_type)}`}>
                  {formatPrice(l)}
                </p>
              </div>
            </div>
          ))
        )}

        <a href="/admin/register"
          className="block w-full p-3 bg-[#1B3A5C] text-white text-center rounded-lg font-semibold mt-4">
          + 새 매물 등록
        </a>
      </div>
    </div>
  )
}
