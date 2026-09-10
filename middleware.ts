import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ── 로그인 없이 접근 허용할 공개 경로(화이트리스트) ──
// 이 목록에 없는 모든 경로는 로그인이 필요하다 (전면 잠금).
const PUBLIC_PREFIXES = [
  '/share/',        // 고객 공유 링크 (핵심 공개 대상)
  '/login',         // 로그인 페이지
]
// 공유 페이지 등 공개 페이지가 사용하는 정적 자산 확장자 (렌더에 필요 → 허용)
const PUBLIC_ASSET_EXT = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|map)$/i

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return false                       // 홈도 잠금
  if (PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) return true
  // Next 내부 리소스는 항상 허용 (matcher에서 대부분 제외되지만 안전차원)
  if (pathname.startsWith('/_next/')) return true
  if (pathname === '/favicon.ico') return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1) 공개 경로는 통과
  if (isPublicPath(pathname)) return NextResponse.next()

  // 2) /_internal_ 및 /heatmap/ : admin iframe 또는 히트맵 내부 fetch에서만 허용 (기존 규칙 유지)
  if (pathname.startsWith('/_internal_') || pathname.startsWith('/heatmap/')) {
    const referer = request.headers.get('referer') || ''
    const allowed = referer.includes('/admin/') || referer.includes('/heatmap/')
    if (!allowed) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // 3) 그 외 모든 경로: 로그인 필요 (전면 잠금)
  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  return response
}

// 정적 리소스(_next, 이미지 등)를 제외한 모든 경로에서 미들웨어 실행 → 전면 잠금 보장.
// 단, 공개해야 하는 정적 자산 확장자는 matcher에서 제외해 성능 확보(로그인 체크 불필요).
export const config = {
  matcher: [
    // _next 내부, 파일 확장자(.svg/.png/.css/.js 등) 제외한 모든 경로에 적용
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|map)$).*)',
  ],
}
