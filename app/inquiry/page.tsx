'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function InquiryPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    message: '',
    agreed: false,
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!form.name || !form.phone) {
      alert('이름과 연락처는 필수입니다.')
      return
    }
    if (!form.agreed) {
      alert('개인정보 수집 동의가 필요합니다.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('inquiries').insert({
      name: form.name,
      phone: form.phone,
      message: form.message,
      privacy_agreed: true,
    })
    setSaving(false)
    if (error) {
      alert('접수 실패: ' + error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-lg mx-auto flex flex-col">
        <header className="bg-[#1B3A5C] text-white p-4 text-center">
          <h1 className="text-lg font-semibold">상담 신청</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-bold mb-2">상담 신청이 접수되었습니다</h2>
          <p className="text-sm text-gray-600 mb-6">담당 전문가가 곧 연락드리겠습니다.</p>
          <a href="/" className="px-6 py-2 bg-[#1B3A5C] text-white rounded-lg text-sm font-semibold">홈으로 돌아가기</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">상담 신청</h1>
      </header>

      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-600">강남 재건축·투자·매매·전세 무엇이든 물어보세요.</p>

        <div>
          <label className="text-xs text-gray-600">이름 *</label>
          <input type="text" placeholder="홍길동"
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})} />
        </div>

        <div>
          <label className="text-xs text-gray-600">연락처 *</label>
          <input type="tel" placeholder="010-0000-0000"
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.phone}
            onChange={e => setForm({...form, phone: e.target.value})} />
        </div>

        <div>
          <label className="text-xs text-gray-600">문의 내용 (선택)</label>
          <textarea placeholder="예) 은마 31평 매수 희망, 예산 20억 이내" rows={4}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            value={form.message}
            onChange={e => setForm({...form, message: e.target.value})} />
        </div>

        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" className="mt-0.5"
            checked={form.agreed}
            onChange={e => setForm({...form, agreed: e.target.checked})} />
          <span>[필수] 개인정보 수집 및 이용에 동의합니다. 수집 항목: 이름, 연락처. 목적: 상담 응대. 보유기간: 상담 완료 후 3개월.</span>
        </label>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50">
          {saving ? '접수 중...' : '상담 신청하기'}
        </button>

        <a href="/" className="block text-center text-xs text-gray-500 underline">← 홈으로</a>
      </div>
    </div>
  )
}
