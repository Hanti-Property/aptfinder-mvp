'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Listing {
  id: string
  complex_name: string
  building_no: string
  unit_no: string
  exclusive_area: number
  supply_area: number
  room_count: number
  bathroom_count: number
  direction: string
  floor: number
  total_floors: number
  transaction_type: string
  sale_price: number
  deposit: number
  monthly_rent: number
  description: string
  features: string
  agency_id: string
  created_at: string
}

interface Agency {
  name: string
  representative: string
  phone1: string
  phone2: string
  address: string
  registration_no: string
}

interface ListingImage {
  image_url: string
  is_primary: boolean
}

export default function ListingDetailPage() {
  const params = useParams()
  const [listing, setListing] = useState<Listing | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [images, setImages] = useState<ListingImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('id', params.id)
        .single()
      if (data) {
        setListing(data)
        // 이미지 가져오기
        const { data: imgData } = await supabase
          .from('listing_images')
          .select('*')
          .eq('listing_id', data.id)
          .order('display_order')
        if (imgData) setImages(imgData)
        // 부동산 정보
        if (data.agency_id) {
          const { data: agencyData } = await supabase
            .from('agencies')
            .select('*')
            .eq('id', data.agency_id)
            .single()
          if (agencyData) setAgency(agencyData)
        }
      }
      setLoading(false)
    }
    fetch()
  }, [params.id])

  function formatPrice(l: Listing) {
    if (l.transaction_type === '매매' && l.sale_price) {
      const a = Math.floor(l.sale_price / 10000)
      const b = l.sale_price % 10000
      return `매매 ${a}억${b ? ` ${b.toLocaleString()}만` : ''}`
    }
    if (l.transaction_type === '전세' && l.deposit) {
      const a = Math.floor(l.deposit / 10000)
      const b = l.deposit % 10000
      return `전세 ${a}억${b ? ` ${b.toLocaleString()}만` : ''}`
    }
    if (l.transaction_type === '월세') {
      const dep = l.deposit ? Math.floor(l.deposit / 10000) : 0
      return `월세 ${dep}억 / 월 ${l.monthly_rent}만`
    }
    return ''
  }

  if (loading) return <div className="p-4 text-center">로딩 중...</div>
  if (!listing) return <div className="p-4 text-center">매물을 찾을 수 없습니다.</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4">
        <a href="/listings" className="text-xs opacity-80">← 매물 목록</a>
      </header>

      {/* 이미지 */}
      {images.length > 0 ? (
        <div className="overflow-x-auto flex gap-1">
          {images.map((img, i) => (
            <img key={i} src={img.image_url} alt={`매물 사진 ${i+1}`}
              className="w-full max-w-lg h-48 object-cover flex-shrink-0" />
          ))}
        </div>
      ) : (
        <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400">사진 없음</span>
        </div>
      )}

      <div className="p-4">
        {/* 가격 + 기본정보 */}
        <div className="mb-4">
          <p className="text-xs text-gray-500">{listing.transaction_type}</p>
          <p style={{color:'#e53935'}} className="text-xl font-bold">{formatPrice(listing)}</p>
          <h1 style={{color:'#111827'}} className="text-lg font-bold mt-1">{listing.complex_name} {listing.building_no}동</h1>
          {listing.features && <p style={{color:'#374151'}} className="text-sm mt-1">{listing.features}</p>}
        </div>

        {/* 상세 정보 */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
          <h3 style={{color:'#111827'}} className="text-sm font-semibold mb-2">매물 정보</h3>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            {listing.exclusive_area && <p><span className="text-gray-500">전용면적</span> <b>{listing.exclusive_area}㎡</b></p>}
            {listing.supply_area && <p><span className="text-gray-500">공급면적</span> <b>{listing.supply_area}㎡</b></p>}
            {listing.room_count && <p><span className="text-gray-500">방</span> <b>{listing.room_count}개</b></p>}
            {listing.bathroom_count && <p><span className="text-gray-500">욕실</span> <b>{listing.bathroom_count}개</b></p>}
            {listing.direction && <p><span className="text-gray-500">방향</span> <b>{listing.direction}</b></p>}
            {listing.floor && <p><span className="text-gray-500">층수</span> <b>{listing.floor}층{listing.total_floors ? ` / ${listing.total_floors}층` : ''}</b></p>}
          </div>
        </div>

        {/* 설명 */}
        {listing.description && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
            <h3 style={{color:'#111827'}} className="text-sm font-semibold mb-2">상세 설명</h3>
            <p style={{color:'#374151'}} className="text-xs leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>
        )}

        {/* 중개사 정보 */}
        {agency && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <h3 style={{color:'#111827'}} className="text-sm font-semibold mb-2">담당 중개사무소</h3>
            <div className="text-xs space-y-1">
              <p><span className="text-gray-500">상호:</span> <b>{agency.name}</b></p>
              <p><span className="text-gray-500">대표:</span> {agency.representative}</p>
              <p><span className="text-gray-500">연락처:</span> {agency.phone1}{agency.phone2 ? ` / ${agency.phone2}` : ''}</p>
              {agency.address && <p><span className="text-gray-500">소재지:</span> {agency.address}</p>}
              {agency.registration_no && <p><span className="text-gray-500">등록번호:</span> {agency.registration_no}</p>}
            </div>
          </div>
        )}

        {/* CTA */}
        <a href="/inquiry" className="block w-full p-3.5 bg-[#1B3A5C] text-white text-center rounded-lg font-semibold">
          상담 신청하기
        </a>

        <div className="mt-3 flex gap-2">
          <a href="/listings" className="flex-1 p-2.5 bg-gray-100 text-center rounded-lg text-xs">← 목록</a>
          <a href="/" className="flex-1 p-2.5 bg-gray-100 text-center rounded-lg text-xs">홈으로</a>
        </div>
      </div>
    </div>
  )
}
