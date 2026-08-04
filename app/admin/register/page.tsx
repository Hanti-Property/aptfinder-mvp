'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Complex {
  id: string
  name: string
  dong: string
}

export default function RegisterPage() {
  const [complexes, setComplexes] = useState<Complex[]>([])
  const [selectedDong, setSelectedDong] = useState('')
  const [form, setForm] = useState({
    complex_id: '',
    complex_name: '',
    building_no: '',
    unit_no: '',
    exclusive_area: '',
    supply_area: '',
    room_count: '',
    bathroom_count: '',
    direction: '',
    floor: '',
    total_floors: '',
    transaction_type: '',
    sale_price: '',
    deposit: '',
    monthly_rent: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('complexes').select('*').order('name')
      if (data) setComplexes(data)
    }
    fetch()
  }, [])

  const dongs = [...new Set(complexes.map(c => c.dong))]
  const filteredComplexes = selectedDong
    ? complexes.filter(c => c.dong === selectedDong)
    : complexes

  function handleComplexChange(id: string) {
    const c = complexes.find(x => x.id === id)
    setForm({ ...form, complex_id: id, complex_name: c?.name || '' })
  }

  async function handleSubmit() {
    if (!form.complex_name || !form.transaction_type) {
      alert('단지와 거래종류는 필수입니다.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('listings').insert({
      complex_id: form.complex_id || null,
      complex_name: form.complex_name,
      building_no: form.building_no,
      unit_no: form.unit_no,
      exclusive_area: form.exclusive_area ? Number(form.exclusive_area) : null,
      supply_area: form.supply_area ? Number(form.supply_area) : null,
      room_count: form.room_count ? Number(form.room_count) : null,
      bathroom_count: form.bathroom_count ? Number(form.bathroom_count) : null,
      direction: form.direction,
      floor: form.floor ? Number(form.floor) : null,
      total_floors: form.total_floors ? Number(form.total_floors) : null,
      transaction_type: form.transaction_type,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      deposit: form.deposit ? Number(form.deposit) : null,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
      description: form.description,
    })
    setSaving(false)
    if (error) {
      alert('등록 실패: ' + error.message)
    } else {
      alert('매물이 등록되었습니다!')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      <header className="bg-[#1B3A5C] text-white p-4 text-center">
        <h1 className="text-lg font-semibold">매물 등록</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* 동 선택 */}
        <div>
          <label className="text-xs text-gray-600">동 선택</label>
          <select
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={selectedDong}
            onChange={e => setSelectedDong(e.target.value)}
          >
            <option value="">전체</option>
            {dongs.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* 단지 선택 */}
        <div>
          <label className="text-xs text-gray-600">단지 선택 *</label>
          <select
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.complex_id}
            onChange={e => handleComplexChange(e.target.value)}
          >
            <option value="">-- 단지를 선택하세요 --</option>
            {filteredComplexes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 동/호수 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">동</label>
            <div className="flex items-center gap-1 mt-1">
              <input type="text" placeholder="예) 101"
                className="flex-1 p-2.5 border border-gray-300 rounded-lg"
                value={form.building_no}
                onChange={e => setForm({...form, building_no: e.target.value})} />
              <span className="text-sm">동</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">호수</label>
            <div className="flex items-center gap-1 mt-1">
              <input type="text" inputMode="numeric" placeholder="예) 301"
                className="flex-1 p-2.5 border border-gray-300 rounded-lg"
                value={form.unit_no}
                onChange={e => setForm({...form, unit_no: e.target.value})} />
              <span className="text-sm">호</span>
            </div>
          </div>
        </div>

        {/* 면적 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">전용면적</label>
            <div className="flex items-center gap-1 mt-1">
              <input type="text" inputMode="numeric" placeholder="예) 84"
                className="flex-1 p-2.5 border border-gray-300 rounded-lg"
                value={form.exclusive_area}
                onChange={e => setForm({...form, exclusive_area: e.target.value})} />
              <span className="text-sm">㎡</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">공급면적</label>
            <div className="flex items-center gap-1 mt-1">
              <input type="text" inputMode="numeric" placeholder="예) 114"
                className="flex-1 p-2.5 border border-gray-300 rounded-lg"
                value={form.supply_area}
                onChange={e => setForm({...form, supply_area: e.target.value})} />
              <span className="text-sm">㎡</span>
            </div>
          </div>
        </div>

        {/* 방수/욕실 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">방 수</label>
            <input type="text" inputMode="numeric" placeholder="예) 3"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.room_count}
              onChange={e => setForm({...form, room_count: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-600">욕실 수</label>
            <input type="text" inputMode="numeric" placeholder="예) 2"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.bathroom_count}
              onChange={e => setForm({...form, bathroom_count: e.target.value})} />
          </div>
        </div>

        {/* 방향/층 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">방향</label>
            <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.direction}
              onChange={e => setForm({...form, direction: e.target.value})}>
              <option value="">선택</option>
              <option>동</option><option>서</option><option>남</option><option>북</option>
              <option>남동</option><option>남서</option><option>북동</option><option>북서</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">층수</label>
            <input type="text" inputMode="numeric" placeholder="예) 10"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.floor}
              onChange={e => setForm({...form, floor: e.target.value})} />
          </div>
        </div>

        {/* 거래종류 */}
        <div>
          <label className="text-xs text-gray-600">거래종류 *</label>
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

        {/* 가격 */}
        {form.transaction_type === '매매' && (
          <div>
            <label className="text-xs text-gray-600">매매가 (만원)</label>
            <input type="text" inputMode="numeric" placeholder="예) 280000"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.sale_price}
              onChange={e => setForm({...form, sale_price: e.target.value})} />
          </div>
        )}
        {form.transaction_type === '전세' && (
          <div>
            <label className="text-xs text-gray-600">보증금 (만원)</label>
            <input type="text" inputMode="numeric" placeholder="예) 150000"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.deposit}
              onChange={e => setForm({...form, deposit: e.target.value})} />
          </div>
        )}
        {form.transaction_type === '월세' && (
          <>
            <div>
              <label className="text-xs text-gray-600">보증금 (만원)</label>
              <input type="text" inputMode="numeric" placeholder="예) 50000"
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
                value={form.deposit}
                onChange={e => setForm({...form, deposit: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-600">월세 (만원)</label>
              <input type="text" inputMode="numeric" placeholder="예) 300"
                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
                value={form.monthly_rent}
                onChange={e => setForm({...form, monthly_rent: e.target.value})} />
            </div>
          </>
        )}

        {/* 설명 */}
        <div>
          <label className="text-xs text-gray-600">매물 설명</label>
          <textarea placeholder="매물 특징을 입력하세요" rows={3}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
        </div>

        {/* 등록 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? '등록 중...' : '매물 등록하기'}
        </button>
      </div>
    </div>
  )
}
