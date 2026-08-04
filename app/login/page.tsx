'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      alert('로그인 실패: ' + error.message)
    } else {
      window.location.href = '/admin/register'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white p-6 rounded-lg shadow">
        <h1 className="text-lg font-bold text-[#1B3A5C] text-center mb-6">AptFinder 관리자 로그인</h1>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-600">이메일</label>
            <input type="email" placeholder="admin@aptfinder.net"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">비밀번호</label>
            <input type="password" placeholder="비밀번호"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full p-3 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>

        <a href="/" className="block text-center text-xs text-gray-400 mt-4">← 홈으로</a>
      </div>
    </div>
  )
}
