'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EditPage() {
  const params = useParams()
  const router = useRouter()
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('id', params.id)
        .single()
      if (data) setForm(data)
    }
    fetch()
  }, [params.id])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('listings')
      .update({
        complex_name: form.complex_name,
        building_no: form.building_no,
        unit_no: form.unit_no,
        exclusive_area: form.exclusive_area ? Number(form.exclusive_area) : null,
        supply_area: form.supply_area ? Number(form.supply_area) : null,
        room_count: form.room_count ? Number(form.room_count) : null,
        bathroom_count: form.bathroom_count ? Number(form.bathroom_count) : null,
        direction: form.direction,
        floor: form.floor ? Number(form.floor) : null,
        transaction_type: form.transaction_type,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        deposit: form.deposit ? Number(form.deposit) : null,
        monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
        description: form.description,
        status: form.status,
      })
      .eq('id', params.id)
    setSaving(false)
    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      alert('수정 완료!')
      router.push('/listings')
    }
  }

  async function handleDelete() {
    if (!confirm('이 매물을 삭제하시겠습니까?')) return
    await supabase.from('listings').delete().eq('id', params.id)
    alert('삭제 완료')
    router.push('/listings')
  }

  if (!form) return <div className="p-4 text-center">로딩 중...</div>

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">매물 수정</h1>
      </header>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-600">단지명</label>
          <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.complex_name || ''}
            onChange={e => setForm({...form, complex_name: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">동</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.building_no || ''}
              onChange={e => setForm({...form, building_no: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-600">호수</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.unit_no || ''}
              onChange={e => setForm({...form, unit_no: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">전용면적 (㎡)</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.exclusive_area || ''}
              onChange={e => setForm({...form, exclusive_area: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-600">방 수</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.room_count || ''}
              onChange={e => setForm({...form, room_count: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">방향</label>
            <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.direction || ''}
              onChange={e => setForm({...form, direction: e.target.value})}>
              <option value="">선택</option>
              <option>동</option><option>서</option><option>남</option><option>북</option>
              <option>남동</option><option>남서</option><option>북동</option><option>북서</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">층수</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.floor || ''}
              onChange={e => setForm({...form, floor: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600">거래종류</label>
          <div className="flex gap-2 mt-1">
            {['매매', '전세', '월세'].map(t => (
              <button key={t}
                className={`flex-1 p-2.5 rounded-lg border text-sm font-semibold
                  ${form.transaction_type === t
                    ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]'
                    : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setForm({...form, transaction_type: t})}
              >{t}</button>
            ))}
          </div>
        </div>

        {form.transaction_type === '매매' && (
          <div>
            <label className="text-xs text-gray-600">매매가 (만원)</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.sale_price || ''}
              onChange={e => setForm({...form, sale_price: e.target.value})} />
          </div>
        )}
        {(form.transaction_type === '전세' || form.transaction_type === '월세') && (
          <div>
            <label className="text-xs text-gray-600">보증금 (만원)</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.deposit || ''}
              onChange={e => setForm({...form, deposit: e.target.value})} />
          </div>
        )}
        {form.transaction_type === '월세' && (
          <div>
            <label className="text-xs text-gray-600">월세 (만원)</label>
            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.monthly_rent || ''}
              onChange={e => setForm({...form, monthly_rent: e.target.value})} />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-600">매물 상태</label>
          <div className="flex gap-2 mt-1">
            {['거래가능', '거래완료'].map(s => (
              <button key={s}
                className={`flex-1 p-2.5 rounded-lg border text-sm font-semibold
                  ${form.status === s
                    ? (s === '거래가능' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600')
                    : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setForm({...form, status: s})}
              >{s}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600">설명</label>
          <textarea rows={3} className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            value={form.description || ''}
            onChange={e => setForm({...form, description: e.target.value})} />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50">
          {saving ? '저장 중...' : '수정 저장'}
        </button>

        <button onClick={handleDelete}
          className="w-full p-3 bg-white text-red-600 border border-red-300 rounded-lg text-sm">
          매물 삭제
        </button>

        <a href="/listings" className="block text-center text-xs text-gray-500 underline">← 목록으로</a>
      </div>
    </div>
  )
}
