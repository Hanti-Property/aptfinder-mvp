// 리서치 노트 HTML 처리 공용 유틸.
// 작성 화면 미리보기 · 공개 상세 페이지가 동일 로직을 공유해 "보이는 대로 발행"을 보장한다.

/**
 * 경량 HTML sanitizer — 에디터가 생성하는 서식 태그만 허용.
 * script/style/이벤트핸들러/javascript: 링크 등 위험요소 제거.
 * 붙여넣기로 들어온 인라인 style/class/불필요 속성도 정리.
 * (브라우저 전용: DOMParser 사용. SSR에서는 원본 반환)
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return html || ''
  const ALLOWED = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'H3', 'UL', 'OL', 'LI',
    'BLOCKQUOTE', 'A', 'BR', 'P', 'DIV', 'SPAN',
  ])
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 1) {
        const el = child as HTMLElement
        if (!ALLOWED.has(el.tagName)) {
          const parent = el.parentNode!
          while (el.firstChild) parent.insertBefore(el.firstChild, el)
          parent.removeChild(el)
          continue
        }
        for (const attr of Array.from(el.attributes)) {
          if (el.tagName === 'A' && attr.name === 'href') {
            if (/^\s*javascript:/i.test(attr.value)) el.removeAttribute('href')
            else { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer') }
          } else {
            el.removeAttribute(attr.name)
          }
        }
        walk(el)
      }
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}

/** HTML 태그 제거 → 목록 미리보기·글자수용 순수 텍스트 */
export function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}
