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

      const recent: RecentItem[] = []

      const { data: recentAgencies } = await supabase.from('agencies').select('*').order('created_at', { ascending: false }).limit(5)
      recentAgencies?.forEach(a => recent.push({
        id: a.id, label: `신규 부동산: ${a.name}`, sub: `대표: ${a.representative || '-'}`, time: a.created_at, type: 'agency'
      }))

      const { data: recentComplexes } = await supabase.from('complexes').select('*').order('created_at', { ascending: false }).limit(5)
      recentComplexes?.forEach(c => recent.push({
        id: c.id, label: `신규 단지: ${c.name}`, sub: c.dong || '', time: c.created_at, type: 'complex'
      }))

      const { data: recentListings } = await supabase.from('listings').select('*').order('created_at', { ascending: false }).limit(5)
      recentListings?.forEach(l => recent.push({
        id: l.id, label: `매물 등록: ${l.complex_name} ${l.building_no || ''}동`, sub: `${l.transaction_type} ${l.sale_price || l.deposit || ''}`, time: l.created_at, type: 'listing'
      }))

      const { data: recentNotes } = await supabase.from('research_notes').select('*').order('created_at', { ascending: false }).limit(3)
      recentNotes?.forEach(n => recent.push({
        id: n.id, label: `노트: ${n.title}`, sub: n.category || '', time: n.created_at, type: 'note'
      }))

      const { data: recentColumns } = await supabase.from('expert_columns').select('*').order('created_at', { ascending: false }).limit(3)
      recentColumns?.forEach(c => recent.push({
        id: c.id, label: `칼럼: ${c.title}`, sub: c.series || '', time: c.created_at, type: 'column'
      }))

      recent.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentItems(recent.slice(0, 12))
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
      agency: 'bg-orange-500/20 text-orange-300',
      complex: 'bg-blue-500/20 text-blue-300',
      listing: 'bg-emerald-500/20 text-emerald-300',
      note: 'bg-purple-500/20 text-purple-300',
      inquiry: 'bg-red-500/20 text-red-300',
      column: 'bg-amber-500/20 text-amber-300',
    }
    return badges[type] || 'bg-gray-500/20 text-gray-300'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#C49A3C] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1a1a2e] max-w-2xl mx-auto">
      {/* Header */}
      <header className="bg-[#0f0f23] border-b border-[#2a2a4a] px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">AptFinder</h1>
          <p className="text-[11px] text-[#C49A3C] font-medium mt-0.5">Admin Console</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-[#e74c3c] text-white px-2 py-0.5 rounded font-semibold">ADMIN</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
            className="text-[11px] text-gray-400 hover:text-white border border-[#2a2a4a] hover:border-[#3a3a5a] px-3 py-1.5 rounded-md transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="p-5 space-y-5">
        {/* 통계 카드 */}
        <section>
          <h2 className="text-[13px] font-semibold text-gray-400 mb-3 uppercase tracking-wider">Overview</h2>
          <div className="grid grid-cols-3 gap-3">
            <a href="/listings" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-[#3a3a5a] transition-colors group">
              <p className="text-3xl font-extrabold text-white group-hover:text-[#C49A3C] transition-colors">{stats.totalListings}</p>
              <p className="text-[11px] text-gray-500 mt-1">총 매물</p>
              {stats.todayListings > 0 && <p className="text-[10px] text-emerald-400 mt-1">+{stats.todayListings} today</p>}
            </a>
            <a href="/notes" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-[#3a3a5a] transition-colors group">
              <p className="text-3xl font-extrabold text-white group-hover:text-[#C49A3C] transition-colors">{stats.totalNotes}</p>
              <p className="text-[11px] text-gray-500 mt-1">리서치 노트</p>
            </a>
            <a href="/admin/columns/list" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-[#3a3a5a] transition-colors group">
              <p className="text-3xl font-extrabold text-[#C49A3C]">{stats.totalColumns}</p>
              <p className="text-[11px] text-gray-500 mt-1">전문가 칼럼</p>
            </a>
            <a href="/admin/inquiries" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-[#3a3a5a] transition-colors group">
              <p className="text-3xl font-extrabold text-white group-hover:text-[#C49A3C] transition-colors">{stats.totalInquiries}</p>
              <p className="text-[11px] text-gray-500 mt-1">상담 문의</p>
            </a>
            <a href="/admin" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-[#3a3a5a] transition-colors group">
              <p className="text-3xl font-extrabold text-orange-400">{stats.totalAgencies}</p>
              <p className="text-[11px] text-gray-500 mt-1">입점 부동산</p>
            </a>
            <a href="/admin" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-[#3a3a5a] transition-colors group">
              <p className="text-3xl font-extrabold text-blue-400">{stats.totalComplexes}</p>
              <p className="text-[11px] text-gray-500 mt-1">등록 단지</p>
            </a>
          </div>
        </section>

        {/* 서비스 모듈 */}
        <section>
          <h2 className="text-[13px] font-semibold text-gray-400 mb-3 uppercase tracking-wider">Service Modules</h2>
          <div className="grid grid-cols-3 gap-3">
            <a href="/real_trade.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-blue-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-lg">🗺️</span>
              </div>
              <p className="text-[11px] font-semibold text-white">실거래가</p>
              <p className="text-[9px] text-gray-500 mt-0.5">지도 기반</p>
            </a>
            <a href="/tax_calc.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-emerald-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="text-lg">🧮</span>
              </div>
              <p className="text-[11px] font-semibold text-white">보유세 계산</p>
              <p className="text-[9px] text-gray-500 mt-0.5">공시가격 연동</p>
            </a>
            <a href="/building_register_map.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-purple-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <span className="text-lg">🏗️</span>
              </div>
              <p className="text-[11px] font-semibold text-white">건축물대장</p>
              <p className="text-[9px] text-gray-500 mt-0.5">지도 조회</p>
            </a>
            <a href="/tax_map.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-amber-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <span className="text-lg">📍</span>
              </div>
              <p className="text-[11px] font-semibold text-white">보유세 (지도)</p>
              <p className="text-[9px] text-gray-500 mt-0.5">지도 기반</p>
            </a>
            <a href="/kakao_map_register.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-rose-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <span className="text-lg">📌</span>
              </div>
              <p className="text-[11px] font-semibold text-white">매물 등록</p>
              <p className="text-[9px] text-gray-500 mt-0.5">카카오맵</p>
            </a>
            <a href="/building_register_api.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-teal-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <span className="text-lg">📄</span>
              </div>
              <p className="text-[11px] font-semibold text-white">건축물대장 API</p>
              <p className="text-[9px] text-gray-500 mt-0.5">직접 조회</p>
            </a>
            <a href="/rent_trade.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-indigo-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <span className="text-lg">🏘️</span>
              </div>
              <p className="text-[11px] font-semibold text-white">전월세</p>
              <p className="text-[9px] text-gray-500 mt-0.5">실거래가</p>
            </a>
            <a href="/admin_index_dashboard.html" target="_blank" className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl p-4 text-center hover:border-cyan-500/50 hover:bg-[#1e1e4f] transition-all group">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <p className="text-[11px] font-semibold text-white">단지 인덱스</p>
              <p className="text-[9px] text-gray-500 mt-0.5">9개 평가지수</p>
            </a>
            <a href="/admin/rvi" className="bg-[#1e1e3f] border border-[#C49A3C]/30 rounded-xl p-4 text-center hover:border-[#C49A3C] hover:bg-[#1e1e4f] transition-all group relative">
              <div className="absolute top-2 right-2 w-2 h-2 bg-[#C49A3C] rounded-full animate-pulse"></div>
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-[#C49A3C]/10 flex items-center justify-center">
                <span className="text-lg">🏗️</span>
              </div>
              <p className="text-[11px] font-semibold text-[#C49A3C]">재건축 RVI</p>
              <p className="text-[9px] text-gray-500 mt-0.5">143개 단지</p>
            </a>
          </div>
        </section>

        {/* 빠른 작업 */}
        <section>
          <h2 className="text-[13px] font-semibold text-gray-400 mb-3 uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <a href="/admin/inquiries" className="bg-gradient-to-r from-[#C49A3C] to-[#d4aa4c] text-[#0f0f23] rounded-xl p-3.5 text-center text-sm font-bold hover:shadow-lg hover:shadow-[#C49A3C]/20 transition-all">
              상담 신청 목록
            </a>
            <a href="/admin/notes" className="bg-gradient-to-r from-[#1B3A5C] to-[#2a4f78] text-white rounded-xl p-3.5 text-center text-sm font-bold hover:shadow-lg hover:shadow-[#1B3A5C]/30 transition-all">
              + 노트 작성
            </a>
            <a href="/admin/columns" className="bg-gradient-to-r from-[#1B3A5C] to-[#2a4f78] text-white rounded-xl p-3.5 text-center text-sm font-bold hover:shadow-lg hover:shadow-[#1B3A5C]/30 transition-all">
              + 칼럼 작성
            </a>
            <a href="/admin/register" className="bg-gradient-to-r from-[#1B3A5C] to-[#2a4f78] text-white rounded-xl p-3.5 text-center text-sm font-bold hover:shadow-lg hover:shadow-[#1B3A5C]/30 transition-all">
              + 매물 등록
            </a>
          </div>
        </section>

        {/* 최근 활동 */}
        <section>
          <h2 className="text-[13px] font-semibold text-gray-400 mb-3 uppercase tracking-wider">Recent Activity</h2>
          <div className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl overflow-hidden">
            {recentItems.length === 0 ? (
              <p className="p-5 text-center text-xs text-gray-500">활동 내역이 없습니다.</p>
            ) : (
              recentItems.map((item, idx) => (
                <div key={`${item.type}-${item.id}`} className={`px-4 py-3 flex items-center justify-between ${idx !== recentItems.length - 1 ? 'border-b border-[#2a2a4a]' : ''} hover:bg-[#12122b] transition-colors`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-gray-200 truncate">{item.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.sub}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${getTypeBadge(item.type)}`}>
                      {item.type === 'agency' ? '부동산' : item.type === 'complex' ? '단지' : item.type === 'listing' ? '매물' : item.type === 'note' ? '노트' : item.type === 'column' ? '칼럼' : '문의'}
                    </span>
                    <p className="text-[10px] text-gray-600 mt-1">{formatTime(item.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 관리 메뉴 */}
        <section>
          <h2 className="text-[13px] font-semibold text-gray-400 mb-3 uppercase tracking-wider">Management</h2>
          <div className="bg-[#1e1e3f] border border-[#2a2a4a] rounded-xl overflow-hidden">
            {[
              { href: '/admin/inquiries', icon: '💬', label: '상담 문의 관리' },
              { href: '/admin/register', icon: '🏠', label: '매물 등록' },
              { href: '/admin/notes', icon: '📝', label: '리서치 노트 작성' },
              { href: '/admin/columns', icon: '✍️', label: '전문가 칼럼 작성' },
              { href: '/admin/columns/list', icon: '📰', label: '칼럼 목록 (수정/삭제)' },
              { href: '/notes', icon: '📋', label: '노트 목록' },
              { href: '/listings', icon: '📦', label: '매물 목록 관리' },
            ].map((item, idx) => (
              <a key={item.href + idx} href={item.href} className={`flex items-center gap-3 px-4 py-3 text-[12px] text-gray-300 hover:bg-[#12122b] hover:text-white transition-colors ${idx !== 6 ? 'border-b border-[#2a2a4a]' : ''}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pb-6 pt-2">
          <a href="/" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">aptfinder.net</a>
          <p className="text-[10px] text-gray-700 mt-1">v2.0 Admin Console</p>
        </div>
      </div>
    </div>
  )
}
