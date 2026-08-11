'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalListings: number
  todayListings: number
  totalNotes: number
  totalColumns: number
  totalAgencies: number
  totalComplexes: number
  totalInquiries: number
}

interface RecentItem {
  id: string
  label: string
  sub: string
  time: string
  type: 'agency' | 'complex' | 'listing' | 'note' | 'inquiry' | 'column'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalListings: 0, todayListings: 0, totalNotes: 0, totalColumns: 0, totalAgencies: 0, totalComplexes: 0, totalInquiries: 0 })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const today = new Date().toISOString().split('T')[0]

      // 통계
      const [listings, todayL, notes, agencies, complexes, inquiries, columns] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('research_notes').select('id', { count: 'exact', head: true }),
        supabase.from('agencies').select('id', { count: 'exact', head: true }),
        supabase.from('complexes').select('id', { count: 'exact', head: true }),
        supabase.from('inquiries').select('id', { count: 'exact', head: true }),
        supabase.from('expert_columns').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        totalListings: listings.count || 0,
        todayListings: todayL.count || 0,
        totalNotes: notes.count || 0,
        totalColumns: columns.count || 0,
        totalAgencies: agencies.count || 0,
        totalComplexes: complexes.count || 0,
        totalInquiries: inquiries.count || 0,
      })

      // 최근 활동 수집
      const recent: RecentItem[] = []

      const { data: recentAgencies } = await supabase.from('agencies').select('*').order('created_at', { ascending: false }).limit(5)
      recentAgencies?.forEach(a => recent.push({
        id: a.id, label: `🏢 신규 부동산: ${a.name}`, sub: `대표: ${a.representative || '-'}`, time: a.created_at, type: 'agency'
      }))

      const { data: recentComplexes } = await supabase.from('complexes').select('*').order('created_at', { ascending: false }).limit(5)
      recentComplexes?.forEach(c => recent.push({
        id: c.id, label: `🏠 신규 단지: ${c.name}`, sub: c.dong || '', time: c.created_at, type: 'complex'
      }))

      const { data: recentListings } = await supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(5)
      recentListings?.forEach(l => recent.push({
        id: l.id, label: `📋 매물 등록: ${l.complex_name} ${l.building_no || ''}동`, sub: `${l.transaction_type} ${l.sale_price || l.deposit || ''}`, time: l.created_at, type: 'listing'
      }))

      const { data: recentNotes } = await supabase.from('research_notes').select('*').order('created_at', { ascending: false }).limit(3)
      recentNotes?.forEach(n => recent.push({
        id: n.id, label: `📝 노트 발행: ${n.title}`, sub: n.category || '', time: n.created_at, type: 'note'
      }))

      const { data: recentColumns } = await supabase.from('expert_columns').select('*').order('created_at', { ascending: false }).limit(3)
      recentColumns?.forEach(c => recent.push({
        id: c.id, label: `🎓 칼럼 발행: ${c.title}`, sub: c.series || '', time: c.created_at, type: 'column'
      }))

      // 시간순 정렬
      recent.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentItems(recent.slice(0, 15))
      setLoading(false)
    }
    fetchData()
  }, [])

  function formatTime(t: string) {
    const d = new Date(t)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 1) return '방금'
    if (diff < 60) return `${diff}분 전`
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`
    return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
  }

  function getTypeBadge(type: string) {
    const badges: Record<string, string> = {
      agency: 'bg-orange-100 text-orange-700',
      complex: 'bg-blue-100 text-blue-700',
      listing: 'bg-green-100 text-green-700',
      note: 'bg-purple-100 text-purple-700',
      inquiry: 'bg-red-100 text-red-700',
      column: 'bg-yellow-100 text-yellow-700',
    }
    return badges[type] || 'bg-gray-100 text-gray-700'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">📊 관리자 대시보드</h1>
          <p className="text-xs opacity-80 mt-1">AptFinder 운영 현황</p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
          className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded"
        >
          로그아웃
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <a href="/listings" className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:bg-gray-50">
            <p className="text-2xl font-bold text-[#1B3A5C]">{stats.totalListings}</p>
            <p className="text-[10px] text-gray-500">총 매물</p>
            {stats.todayListings > 0 && <p className="text-[9px] text-green-600">+{stats.todayListings} 오늘</p>}
          </a>
          <a href="/notes" className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:bg-gray-50">
            <p className="text-2xl font-bold text-[#1B3A5C]">{stats.totalNotes}</p>
            <p className="text-[10px] text-gray-500">리서치 노트</p>
          </a>
          <a href="/admin/columns/list" className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:bg-gray-50">
            <p className="text-2xl font-bold text-[#C49A3C]">{stats.totalColumns}</p>
            <p className="text-[10px] text-gray-500">전문가 칼럼</p>
          </a>
          <a href="/admin/inquiries" className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:bg-gray-50">
            <p className="text-2xl font-bold text-[#1B3A5C]">{stats.totalInquiries}</p>
            <p className="text-[10px] text-gray-500">상담 문의</p>
          </a>
          <a href="/admin" className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:bg-gray-50">
            <p className="text-2xl font-bold text-orange-600">{stats.totalAgencies}</p>
            <p className="text-[10px] text-gray-500">입점 부동산</p>
          </a>
          <a href="/admin" className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:bg-gray-50">
            <p className="text-2xl font-bold text-blue-600">{stats.totalComplexes}</p>
            <p className="text-[10px] text-gray-500">등록 단지</p>
          </a>
        </div>

        {/* 서비스 모듈 (개발 도구) */}
        <div>
          <h2 className="text-sm font-semibold mb-2">🧩 서비스 모듈</h2>
          <div className="grid grid-cols-2 gap-2">
            <a href="/real_trade.html" target="_blank" className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg">🗺️</p>
              <p className="text-xs font-semibold text-blue-800">실거래가 조회</p>
              <p className="text-[10px] text-blue-600">지도 기반</p>
            </a>
            <a href="/tax_calc.html" target="_blank" className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg">🧮</p>
              <p className="text-xs font-semibold text-green-800">보유세 계산기</p>
              <p className="text-[10px] text-green-600">공시가격 연동</p>
            </a>
            <a href="/building_register_map.html" target="_blank" className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg">🏗️</p>
              <p className="text-xs font-semibold text-purple-800">건축물대장</p>
              <p className="text-[10px] text-purple-600">지도 기반 조회</p>
            </a>
            <a href="/tax_map.html" target="_blank" className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg">📍</p>
              <p className="text-xs font-semibold text-amber-800">보유세 (지도)</p>
              <p className="text-[10px] text-amber-600">지도 기반 계산</p>
            </a>
            <a href="/kakao_map_register.html" target="_blank" className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg">📌</p>
              <p className="text-xs font-semibold text-rose-800">매물 등록 (지도)</p>
              <p className="text-[10px] text-rose-600">카카오맵 연동</p>
            </a>
            <a href="/building_register_api.html" target="_blank" className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
              <p className="text-lg">📄</p>
              <p className="text-xs font-semibold text-teal-800">건축물대장 API</p>
              <p className="text-[10px] text-teal-600">직접 조회</p>
            </a>
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 gap-2">
          <a href="/admin/register" className="bg-[#1B3A5C] text-white rounded-lg p-3 text-center text-sm font-semibold">+ 매물 등록</a>
          <a href="/admin/notes" className="bg-[#1B3A5C] text-white rounded-lg p-3 text-center text-sm font-semibold">+ 노트 작성</a>
          <a href="/admin/columns" className="bg-[#1B3A5C] text-white rounded-lg p-3 text-center text-sm font-semibold">+ 칼럼 작성</a>
          <a href="/admin/columns/list" className="bg-white border border-gray-300 rounded-lg p-3 text-center text-sm">칼럼 관리</a>
          <a href="/listings" className="bg-white border border-gray-300 rounded-lg p-3 text-center text-sm">매물 목록</a>
          <a href="/notes" className="bg-white border border-gray-300 rounded-lg p-3 text-center text-sm">노트 목록</a>
        </div>

        {/* 최근 활동 */}
        <div>
          <h2 className="text-sm font-semibold mb-2">🔔 최근 활동</h2>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {recentItems.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-400">활동 내역이 없습니다.</p>
            ) : (
              recentItems.map(item => (
                <div key={`${item.type}-${item.id}`} className="p-3 flex items-center justify-between">
                  <div>
                    <p style={{color:'#111827'}} className="text-xs font-medium">{item.label}</p>
                    <p className="text-[10px] text-gray-500">{item.sub}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${getTypeBadge(item.type)}`}>
                      {item.type === 'agency' ? '부동산' : item.type === 'complex' ? '단지' : item.type === 'listing' ? '매물' : item.type === 'note' ? '노트' : item.type === 'column' ? '칼럼' : '문의'}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(item.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 관리 링크 */}
        <div>
          <h2 className="text-sm font-semibold mb-2">⚙️ 관리</h2>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            <a href="/admin/inquiries" className="block p-3 text-xs hover:bg-gray-50">💬 상담 문의 관리</a>
            <a href="/admin/register" className="block p-3 text-xs hover:bg-gray-50">🏠 매물 등록</a>
            <a href="/admin/notes" className="block p-3 text-xs hover:bg-gray-50">📝 리서치 노트 작성</a>
            <a href="/admin/columns" className="block p-3 text-xs hover:bg-gray-50">✍️ 전문가 칼럼 작성</a>
            <a href="/admin/columns/list" className="block p-3 text-xs hover:bg-gray-50">📰 칼럼 목록 (수정/삭제)</a>
            <a href="/notes" className="block p-3 text-xs hover:bg-gray-50">📋 노트 목록 (수정/삭제)</a>
            <a href="/listings" className="block p-3 text-xs hover:bg-gray-50">📦 매물 목록 관리</a>
          </div>
        </div>

        <div className="text-center">
          <a href="/" className="text-xs text-gray-400 underline">← 홈으로</a>
        </div>
      </div>
    </div>
  )
}
