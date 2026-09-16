// 숫자 표시 공통 규칙 (전 시스템 공통 적용)
// - 일반 숫자: 천단위 콤마 (예: 528,772)
// - 연도: 콤마 없이 (예: 1979) — 아래 YEAR_KEYS 또는 isYearKey로 판정
// - 편집 시: 콤마 제거하고 입력, 저장 시 콤마 제거해 숫자화

// 연도 성격 필드 키 (콤마 안 붙임)
export const YEAR_KEYS = new Set([
  'built_year', 'move_in', 'move_start_year', 'built_year_est',
  'latest_date', 'price_updated', 'far_source', 'plat_area_source', 'doc_date',
])

export function isYearKey(key?: string): boolean {
  if (!key) return false
  return YEAR_KEYS.has(key) || /year|연도|_date|일자/i.test(key)
}

// 값 → 표시 문자열 (콤마). 연도키면 콤마 없이. null/빈값은 빈문자열.
export function fmtNum(value: unknown, key?: string): string {
  if (value == null || value === '') return ''
  const n = Number(String(value).replace(/,/g, ''))
  if (isNaN(n)) return String(value)
  if (isYearKey(key)) return String(n)          // 연도: 콤마 없이
  return n.toLocaleString()                       // 일반: 콤마
}

// 표시 문자열(콤마 포함) → 숫자. 저장·계산용.
export function parseNum(text: unknown): number | null {
  if (text == null || text === '') return null
  const n = Number(String(text).replace(/,/g, ''))
  return isNaN(n) ? null : n
}
