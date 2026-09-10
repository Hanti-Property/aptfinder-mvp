'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LogoutPage() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    (async () => {
      try { await supabase.auth.signOut() } catch (e) { /* 무시 */ }
      setDone(true)
      // 잠깐 안내 후 로그인 페이지로 이동
      setTimeout(() => { window.location.href = '/login' }, 900)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow text-center">
        <h1 className="text-lg font-bold text-[#1B3A5C] mb-3">AptFinder</h1>
        <p className="text-sm text-gray-600">
          {done ? '로그아웃되었습니다. 로그인 화면으로 이동합니다…' : '로그아웃 중…'}
        </p>
        <a href="/login" className="block text-center text-xs text-gray-400 mt-4">로그인으로 이동 →</a>
      </div>
    </div>
  )
}
