'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { collectByAddress, type CollectResult } from '@/lib/complexCollector'

// 단지 정보 자동수집·검수·입력 (collector)
// 지도 클릭 → 주소 → 건축물대장·토지대장·실거래 자동조회 → 교차검증 표 → 마스터 신규/업데이트.
// 자동입력 가능하지만 최종 승인은 사람(검수 원칙).

declare global { interface Window { kakao: any } }

const KAKAO_KEY = 'ac5ad10b0ae27c4e8ed8b5a5fe68f15b'

interface FieldRow { key: string; label: string; auto: unknown; master: unknown; unit: string; on: boolean; value: unknown; note: string }

export default function CollectorPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapObj = useRef<any>(null)
  const geocoder = useRef<any>(null)
  const marker = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CollectResult | null>(null)
  const [rows, setRows] = useState<FieldRow[]>([])
  const [existing, setExisting] = useState<Record<string, unknown> | null>(null)  // 마스터 기존 단지
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // 지도 초기화
  useEffect(() => {
    const init = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return
        mapObj.current = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(37.4976, 127.0654), level: 4,
        })
        geocoder.current = new window.kakao.maps.services.Geocoder()
        window.kakao.maps.event.addListener(mapObj.current, 'click', (e: any) => {
          probe(e.latLng.getLat(), e.latLng.getLng())
        })
      })
    }
    if (window.kakao && window.kakao.maps) { init(); return }
    const s = document.createElement('script')
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`
    s.onload = init
    document.head.appendChild(s)
  }, [])

  const probe = useCallback(async (lat: number, lng: number) => {
    setMsg(''); setResult(null); setRows([]); setExisting(null); setLoading(true)
    if (marker.current) marker.current.setMap(null)
    marker.current = new window.kakao.maps.Marker({ position: new window.kakao.maps.LatLng(lat, lng) })
    marker.current.setMap(mapObj.current)
    // 좌표 → 주소
    geocoder.current.coord2Address(lng, lat, async (res: any, st: string) => {
      if (st !== window.kakao.maps.services.Status.OK || !res.length) { setMsg('주소를 찾지 못했습니다.'); setLoading(false); return }
      const a = res[0].address
      const gu = a.region_2depth_name, dong = a.region_3depth_name
      const bun = a.main_address_no, ji = a.sub_address_no || '0'
      try {
        const r = await collectByAddress(gu, dong, bun, ji)
        setResult(r)
        // 마스터에 이미 있는지 (동+지번 매칭)
        const { data: ex } = await supabase.from('recon_master').select('*')
          .eq('dong', dong).eq('jibun', r.jibun).limit(1)
        const exist = (ex && ex[0]) || null
        setExisting(exist)
        buildRows(r, exist)
      } catch (e) { setMsg('조회 오류: ' + (e as Error).message) }
      setLoading(false)
    })
  }, [])

  const buildRows = (r: CollectResult, ex: Record<string, unknown> | null) => {
    const b = r.building
    const rr: FieldRow[] = [
      { key: 'far', label: '현재 용적률', unit: '%', auto: b.far, master: ex?.far ?? null, on: b.far != null, value: b.far, note: '건축물대장' },
      { key: 'households', label: '현재 세대수', unit: '세대', auto: b.households, master: ex?.households ?? null, on: b.households != null, value: b.households, note: '건축물대장' },
      { key: 'built_year', label: '준공연도', unit: '', auto: b.builtYear, master: ex?.built_year ?? null, on: b.builtYear != null, value: b.builtYear, note: '건축물대장(사용승인)' },
      { key: 'tot_area', label: '현재 연면적', unit: '㎡', auto: b.totArea ? Math.round(b.totArea) : null, master: ex?.tot_area ?? null, on: b.totArea != null, value: b.totArea ? Math.round(b.totArea) : null, note: '건축물대장(총괄)' },
      { key: 'plat_area', label: '대지면적', unit: '㎡', auto: r.land?.area ?? null, master: ex?.plat_area ?? null, on: r.land?.area != null, value: r.land?.area ?? null, note: `토지대장${r.landCheck === 'warn' ? ' ⚠️역산과 갭' : r.landCheck === 'ok' ? ' ✓역산일치' : ''}` },
      { key: 'avg_ppp', label: '전용평당가', unit: '만/평', auto: r.trade?.avgPpp ?? null, master: ex?.avg_ppp ?? null, on: false, value: r.trade?.avgPpp ?? null, note: r.trade?.count ? `실거래 ${r.trade.count}건` : '거래매칭 없음' },
      { key: 'bjdong', label: '법정동코드', unit: '', auto: b.bjdong, master: ex?.bjdong ?? null, on: b.bjdong != null, value: b.bjdong, note: '동명매칭 확정' },
    ]
    setRows(rr)
  }

  const searchMove = () => {
    if (!search.trim() || !geocoder.current) return
    geocoder.current.addressSearch(search.trim(), (res: any, st: string) => {
      if (st === window.kakao.maps.services.Status.OK && res.length) {
        const ll = new window.kakao.maps.LatLng(res[0].y, res[0].x)
        mapObj.current.setCenter(ll); mapObj.current.setLevel(3)
      } else {
        // 키워드 검색 폴백
        new window.kakao.maps.services.Places().keywordSearch(search.trim(), (d: any, s2: string) => {
          if (s2 === window.kakao.maps.services.Status.OK && d.length) {
            mapObj.current.setCenter(new window.kakao.maps.LatLng(d[0].y, d[0].x)); mapObj.current.setLevel(3)
          } else setMsg('검색 결과 없음')
        })
      }
    })
  }

  const applyToMaster = async () => {
    if (!result) return
    const upd: Record<string, unknown> = {}
    rows.forEach(r => { if (r.on && r.value != null) upd[r.key] = r.value })
    if (!Object.keys(upd).length) { setMsg('반영할 항목을 선택하세요.'); return }
    setSaving(true); setMsg('')
    if (existing) {
      upd.updated_at = new Date().toISOString()
      const { error } = await supabase.from('recon_master').update(upd).eq('id', existing.id as string)
      setSaving(false)
      if (error) { setMsg('업데이트 실패: ' + error.message); return }
      setMsg(`✓ 기존 단지 업데이트: ${existing.short_name || existing.name} (${Object.keys(upd).length - 1}개 항목)`)
    } else {
      // 신규: 최소 식별정보 + 선택 항목. asset_id·ticker는 수동 확정 필요 → draft로.
      upd.gu = result.gu; upd.dong = result.dong; upd.jibun = result.jibun; upd.lawd = result.lawd
      upd.name = result.building.aptNm || `${result.dong} ${result.jibun}`
      upd.status = 'draft'; upd.type = 'reconstruction'
      upd.updated_at = new Date().toISOString()
      const { error } = await supabase.from('recon_master').insert(upd)
      setSaving(false)
      if (error) { setMsg('신규 등록 실패: ' + error.message); return }
      setMsg(`✓ 신규 단지 등록됨(작성중 상태). /admin/recon에서 자산코드·티커 확정하세요.`)
    }
  }

  const fmt = (v: unknown) => v == null ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#083458', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', background: '#061f38', borderBottom: '1px solid #1c466e', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>🧭 단지 자동수집·검수</span>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchMove()}
            placeholder="주소/단지 검색 후 지도이동" style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #1c466e', background: '#0b2c4a', color: '#fff' }} />
          <button onClick={searchMove} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#1B3A5C', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>이동</button>
        </div>
        <div ref={mapRef} style={{ flex: 1 }} />
      </div>

      <div style={{ width: 400, background: '#fff', color: '#222', overflowY: 'auto', borderLeft: '1px solid #1c466e' }}>
        <div style={{ padding: '12px 16px', background: '#f0f3f7', borderBottom: '1px solid #e5e5e5', fontWeight: 700, color: '#1B3A5C' }}>
          🔍 자동조회 결과 {loading && <span style={{ fontWeight: 400, fontSize: 12, color: '#888' }}>· 조회 중…</span>}
        </div>
        {!result && !loading && <div style={{ padding: 16, fontSize: 13, color: '#888', lineHeight: 1.7 }}>지도에서 재건축 단지를 클릭하세요.<br />건축물대장·토지대장·실거래를 자동 조회해 마스터 반영을 도와줍니다.</div>}
        {result && (
          <div style={{ padding: '10px 16px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1B3A5C', marginBottom: 4 }}>
              {result.building.aptNm || '(단지명 미확인)'}
            </div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              {result.gu} {result.dong} {result.jibun}
              {existing ? <span style={{ marginLeft: 8, color: '#2E7D32', fontWeight: 700 }}>● 마스터 등록됨 (업데이트)</span>
                : <span style={{ marginLeft: 8, color: '#C79A5B', fontWeight: 700 }}>○ 신규 (등록 가능)</span>}
            </div>
            {!result.lawd && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 8 }}>지원 구가 아닙니다(구코드 미등록).</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ color: '#888', fontSize: 11, textAlign: 'left' }}>
                <th style={{ padding: '4px 2px', width: 30 }}>반영</th><th style={{ padding: '4px 2px' }}>항목</th>
                <th style={{ padding: '4px 2px' }}>자동값</th><th style={{ padding: '4px 2px' }}>기존값</th>
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const diff = existing && r.master != null && String(r.master) !== String(r.value)
                  return (
                    <tr key={r.key} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '7px 2px' }}><input type="checkbox" checked={r.on} onChange={e => setRows(rs => rs.map(x => x.key === r.key ? { ...x, on: e.target.checked } : x))} /></td>
                      <td style={{ padding: '7px 2px' }}>{r.label}<div style={{ fontSize: 10, color: '#999' }}>{r.note}</div></td>
                      <td style={{ padding: '7px 2px', fontWeight: 700, color: '#1B3A5C' }}>
                        <input value={r.value == null ? '' : String(r.value)} onChange={e => setRows(rs => rs.map(x => x.key === r.key ? { ...x, value: e.target.value } : x))}
                          style={{ width: 70, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 4 }} />{r.unit}
                      </td>
                      <td style={{ padding: '7px 2px', color: diff ? '#e67e22' : '#999' }}>{fmt(r.master)}{diff && <span style={{ fontSize: 10, marginLeft: 3 }}>변경</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button onClick={applyToMaster} disabled={saving || !result.lawd}
              style={{ marginTop: 14, width: '100%', padding: '10px', borderRadius: 6, border: 'none', background: existing ? '#2E7D32' : '#C79A5B', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {saving ? '반영 중…' : existing ? '✓ 기존 단지 업데이트' : '+ 신규 단지 등록 (작성중)'}
            </button>
            {result.trade && result.trade.recent && result.trade.recent.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A5C', marginBottom: 4 }}>💰 최근 실거래 {result.trade.recent.length}건 <span style={{ fontWeight: 400, color: '#888' }}>(6개월, 해제거래 제외)</span></div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead><tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: '3px 2px' }}>거래일</th><th style={{ padding: '3px 2px' }}>전용㎡</th>
                    <th style={{ padding: '3px 2px', textAlign: 'right' }}>거래가</th><th style={{ padding: '3px 2px' }}>층</th>
                    <th style={{ padding: '3px 2px', textAlign: 'right' }}>평당</th>
                  </tr></thead>
                  <tbody>
                    {result.trade.recent.map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f2f2f2' }}>
                        <td style={{ padding: '4px 2px', whiteSpace: 'nowrap' }}>{t.date}</td>
                        <td style={{ padding: '4px 2px' }}>{t.area}</td>
                        <td style={{ padding: '4px 2px', textAlign: 'right', fontWeight: 700, color: '#1B3A5C' }}>{(t.amount / 10000).toFixed(1)}억</td>
                        <td style={{ padding: '4px 2px', color: '#888' }}>{t.floor}</td>
                        <td style={{ padding: '4px 2px', textAlign: 'right', color: '#666' }}>{t.ppp.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.trade && !result.trade.avgPpp && result.trade.names.length > 0 && (
              <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>이 동 실거래 단지: {result.trade.names.join(', ')}</div>
            )}
            <div style={{ fontSize: 11, color: '#c0392b', marginTop: 10, lineHeight: 1.5 }}>⚠️ 자동조회는 검수용입니다. 값 확인 후 반영하세요. 정비계획(목표용적률·비례율)은 /admin/docs에서 별도 관리.</div>
          </div>
        )}
        {msg && <div style={{ padding: '10px 16px', fontSize: 13, color: msg.includes('실패') || msg.includes('오류') ? '#c0392b' : '#2E7D32', fontWeight: 600 }}>{msg}</div>}
      </div>
    </div>
  )
}
