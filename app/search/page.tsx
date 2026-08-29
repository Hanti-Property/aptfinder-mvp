'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatComplexLabel } from '@/lib/tickers'

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [listings, setListings] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function search() {
      if (!query) { setLoading(false); return }
      const [listRes, noteRes] = await Promise.all([
        supabase.from('listings').select('*, listing_images(image_url, is_primary)')
          .or(`complex_name.ilike.%${query}%,description.ilike.%${query}%`)
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('research_notes').select('*')
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .order('created_at', { ascending: false }).limit(20),
      ])
      if (listRes.data) setListings(listRes.data)
      if (noteRes.data) setNotes(noteRes.data)
      setLoading(false)
    }
    search()
  }, [query])

  function formatPrice(l: any) {
    if (l.transaction_type === '매매' && l.sale_price) {
      const a = Math.floor(l.sale_price / 10000)
      return `매매 ${a}억`
    }
    if (l.transaction_type === '전세' && l.deposit) {
      return `전세 ${Math.floor(l.deposit / 10000)}억`
    }
    if (l.transaction_type === '월세') {
      return `월세 ${l.deposit ? Math.floor(l.deposit / 10000) : 0}억/월${l.monthly_rent}만`
    }
    return ''
  }

  if (loading) return <div className="p-4 text-center">검색 중...</div>

  return (
    <div className="p-4">
      <p className="text-sm text-gray-500 mb-4">&quot;{query}&quot; 검색 결과: 매물 {listings.length}건, 노트 {notes.length}건</p>

      {/* 노트 결과 */}
      {notes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-bold mb-2" style={{color:'#111827'}}>📝 리서치 노트</h2>
          {notes.map(note => (
            <div key={note.id} onClick={() => window.location.href = `/notes/${note.id}`}
              className="border border-gray-200 rounded-lg p-3 mb-2 cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-[#1B3A5C] text-white px-1.5 py-0.5 rounded">{note.category}</span>
                <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString('ko-KR', {month:'numeric', day:'numeric'})}</span>
              </div>
              <p style={{color:'#111827'}} className="text-base font-semibold">{note.title}</p>
              <p style={{color:'#374151'}} className="text-sm line-clamp-1 mt-0.5">{note.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 매물 결과 */}
      {listings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-bold mb-2" style={{color:'#111827'}}>🏠 매물</h2>
          {listings.map(l => {
            const img = l.listing_images?.find((i: any) => i.is_primary) || l.listing_images?.[0]
            return (
              <div key={l.id} onClick={() => window.location.href = `/listings/${l.id}`}
                className="flex gap-3 p-3 border border-gray-200 rounded-lg mb-2 cursor-pointer hover:bg-gray-50">
                {img ? (
                  <img src={img.image_url} alt={l.complex_name} className="w-20 h-16 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-20 h-16 bg-[#1B3A5C] rounded flex-shrink-0 flex items-center justify-center">
                    <span className="text-[9px] text-white font-bold">AptFinder</span>
                  </div>
                )}
                <div>
                  <p style={{color:'#111827'}} className="text-sm font-bold">{formatComplexLabel(l.complex_name)} {l.building_no}동</p>
                  <p className="text-xs text-gray-500">전용 {l.exclusive_area}㎡</p>
                  <p className="text-sm font-bold text-red-600">{formatPrice(l)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {listings.length === 0 && notes.length === 0 && (
        <p className="text-center text-gray-400 py-8">검색 결과가 없습니다.</p>
      )}

      <a href="/" className="block text-center text-sm text-gray-500 underline mt-4">← 홈으로</a>
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-xl font-semibold">검색 결과</h1>
      </header>
      <Suspense fallback={<div className="p-4 text-center">검색 중...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  )
}
