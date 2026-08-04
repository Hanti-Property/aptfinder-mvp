'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Complex {
  id: string
  name: string
  dong: string
  road_address?: string
  lot_address?: string
  total_units?: number
  built_year?: number
  total_buildings?: number
  constructor?: string
}

export default function RegisterPage() {
  const [complexes, setComplexes] = useState<Complex[]>([])
  const [selectedDong, setSelectedDong] = useState('')
  const [showNewComplex, setShowNewComplex] = useState(false)
  const [newComplex, setNewComplex] = useState({ name: '', road_address: '', lot_address: '', dong: '' })
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    features: '',
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
    if (id === '__new__') {
      setShowNewComplex(true)
      setSelectedComplex(null)
      setForm({ ...form, complex_id: '', complex_name: '' })
      return
    }
    setShowNewComplex(false)
    const c = complexes.find(x => x.id === id)
    setSelectedComplex(c || null)
    setForm({ ...form, complex_id: id, complex_name: c?.name || '' })
  }

  // 이미지 처리
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 20) {
      alert('최대 20장까지 업로드 가능합니다.')
      return
    }
    const newImages = [...images, ...files]
    setImages(newImages)
    const previews = newImages.map(f => URL.createObjectURL(f))
    setImagePreviews(previews)
  }

  function removeImage(idx: number) {
    const newImages = images.filter((_, i) => i !== idx)
    setImages(newImages)
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)))
  }

  // 신규 단지 등록
  async function registerNewComplex() {
    if (!newComplex.name || !newComplex.road_address || !newComplex.lot_address) {
      alert('단지명, 도로명주소, 지번주소를 모두 입력해주세요.')
      return
    }
    const { data, error } = await supabase.from('complexes').insert({
      name: newComplex.name,
      dong: newComplex.dong || selectedDong,
      road_address: newComplex.road_address,
      lot_address: newComplex.lot_address,
      verified: false,
    }).select().single()

    if (error) {
      alert('단지 등록 실패: ' + error.message)
      return
    }
    alert('✅ 신규 단지가 등록되었습니다!\n관리자에게 검증 알림이 발송됩니다.')
    setComplexes([...complexes, data])
    setForm({ ...form, complex_id: data.id, complex_name: data.name })
    setSelectedComplex(data)
    setShowNewComplex(false)
  }

  async function handleSubmit() {
    if (!form.complex_name || !form.transaction_type) {
      alert('단지와 거래종류는 필수입니다.')
      return
    }
    setSaving(true)

    // 1. 매물 등록
    const { data: listing, error } = await supabase.from('listings').insert({
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
      features: form.features,
    }).select().single()

    if (error) {
      setSaving(false)
      alert('등록 실패: ' + error.message)
      return
    }

    // 2. 이미지 업로드
    if (listing && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const file = images[i]
        const ext = file.name.split('.').pop()
        const path = `listings/${listing.id}/${i}.${ext}`
        await supabase.storage.from('listing-images').upload(path, file)
        const { data: urlData } = supabase.storage.from('listing-images').getPublicUrl(path)
        await supabase.from('listing_images').insert({
          listing_id: listing.id,
          image_url: urlData.publicUrl,
          display_order: i,
          is_primary: i === 0,
        })
      }
    }

    setSaving(false)
    alert('✅ 매물이 등록되었습니다!' + (images.length > 0 ? ` (사진 ${images.length}장 업로드)` : ''))
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
            <option value="__new__">➕ 신규 단지 직접 등록</option>
          </select>
        </div>

        {/* 선택된 단지 정보 표시 */}
        {selectedComplex && (
          <div className="bg-blue-50 border-l-3 border-[#1B3A5C] p-3 rounded-r-lg">
            <p className="text-xs font-semibold text-[#1B3A5C] mb-1">📍 단지 정보</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
              <span>단지명: <b>{selectedComplex.name}</b></span>
              <span>소재지: {selectedComplex.dong}</span>
              {selectedComplex.road_address && <span>도로명: {selectedComplex.road_address}</span>}
              {selectedComplex.total_units && <span>세대수: {selectedComplex.total_units}세대</span>}
              {selectedComplex.built_year && <span>준공: {selectedComplex.built_year}년</span>}
              {selectedComplex.total_buildings && <span>동수: {selectedComplex.total_buildings}개동</span>}
              {selectedComplex.constructor && <span>시공사: {selectedComplex.constructor}</span>}
            </div>
          </div>
        )}

        {/* 신규 단지 등록 */}
        {showNewComplex && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-lg">📍</span>
              <div>
                <p className="text-sm font-bold text-orange-800">이 단지는 처음 등록되는 단지입니다</p>
                <p className="text-xs text-gray-600 mt-1">정확한 매물 정보 제공을 위해 주소를 확인해 주세요.<br/>
                <b>한 번만 입력하시면 다음부터는 자동으로 채워집니다.</b></p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">단지명 *</label>
                <input type="text" placeholder="예) 대치삼성래미안"
                  className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
                  value={newComplex.name}
                  onChange={e => setNewComplex({...newComplex, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-600">도로명주소 *</label>
                <input type="text" placeholder="예) 서울 강남구 삼성로 172"
                  className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
                  value={newComplex.road_address}
                  onChange={e => setNewComplex({...newComplex, road_address: e.target.value})} />
                <p className="text-[10px] text-gray-400 mt-1">💡 등기부등본 또는 건축물대장의 도로명주소를 입력하세요</p>
              </div>
              <div>
                <label className="text-xs text-gray-600">지번주소 *</label>
                <input type="text" placeholder="예) 서울 강남구 대치동 332"
                  className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
                  value={newComplex.lot_address}
                  onChange={e => setNewComplex({...newComplex, lot_address: e.target.value})} />
                <p className="text-[10px] text-gray-400 mt-1">💡 &quot;○○동 ○○○&quot; 형태로 입력하세요</p>
              </div>
              <div>
                <label className="text-xs text-gray-600">동 (행정동)</label>
                <select className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
                  value={newComplex.dong}
                  onChange={e => setNewComplex({...newComplex, dong: e.target.value})}>
                  <option value="">선택</option>
                  <option>대치동</option><option>도곡동</option><option>개포동</option>
                  <option>삼성동</option><option>압구정동</option><option>청담동</option>
                  <option>역삼동</option><option>논현동</option><option>일원동</option><option>수서동</option>
                </select>
              </div>
              <div className="bg-green-50 p-2 rounded-lg">
                <p className="text-[11px] text-green-700">✅ 입력하신 주소는 관리자가 검증 후 확정됩니다. 매물 등록은 바로 진행할 수 있습니다.</p>
              </div>
              <button onClick={registerNewComplex}
                className="w-full p-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold">
                단지 등록 후 계속 →
              </button>
            </div>
          </div>
        )}

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

        {/* 총 층수 */}
        <div>
          <label className="text-xs text-gray-600">건물 총 층수</label>
          <input type="text" inputMode="numeric" placeholder="예) 15"
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.total_floors}
            onChange={e => setForm({...form, total_floors: e.target.value})} />
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
            <input type="text" inputMode="numeric" placeholder="예) 280000 (28억)"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.sale_price}
              onChange={e => setForm({...form, sale_price: e.target.value})} />
          </div>
        )}
        {form.transaction_type === '전세' && (
          <div>
            <label className="text-xs text-gray-600">보증금 (만원)</label>
            <input type="text" inputMode="numeric" placeholder="예) 150000 (15억)"
              className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
              value={form.deposit}
              onChange={e => setForm({...form, deposit: e.target.value})} />
          </div>
        )}
        {form.transaction_type === '월세' && (
          <>
            <div>
              <label className="text-xs text-gray-600">보증금 (만원)</label>
              <input type="text" inputMode="numeric" placeholder="예) 50000 (5억)"
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

        {/* 매물 특징 (60자) */}
        <div>
          <label className="text-xs text-gray-600">매물 특징 (한줄, 60자)</label>
          <input type="text" placeholder="예) 남향 로열층, 올수리, 즉시입주" maxLength={60}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1"
            value={form.features}
            onChange={e => setForm({...form, features: e.target.value})} />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{form.features.length}/60</p>
        </div>

        {/* 상세 설명 */}
        <div>
          <label className="text-xs text-gray-600">상세 설명</label>
          <textarea placeholder="매물의 장점, 주변 환경, 특이사항 등을 자세히 입력하세요" rows={4}
            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 resize-none"
            maxLength={2000}
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{form.description.length}/2000</p>
        </div>

        {/* 사진 업로드 */}
        <div>
          <label className="text-xs text-gray-600">매물 사진 (최대 20장)</label>
          <div className="mt-2">
            <input type="file" accept="image/*" multiple ref={fileInputRef}
              className="hidden" onChange={handleImageSelect} />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#1B3A5C] hover:text-[#1B3A5C] transition-colors">
              📷 사진 추가 (클릭 또는 촬영)
            </button>
          </div>
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`미리보기 ${i+1}`}
                    className="w-full h-20 object-cover rounded-lg border" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[8px] bg-[#1B3A5C] text-white px-1 rounded">대표</span>
                  )}
                  <button onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-1">첫 번째 사진이 대표 이미지로 설정됩니다. ({images.length}/20)</p>
        </div>

        {/* 등록 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full p-3.5 bg-[#1B3A5C] text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? '등록 중...' : '매물 등록하기'}
        </button>

        {/* 홈으로 */}
        <div className="text-center">
          <a href="/" className="text-xs text-gray-400 underline">← 홈으로 돌아가기</a>
        </div>
      </div>
    </div>
  )
}
