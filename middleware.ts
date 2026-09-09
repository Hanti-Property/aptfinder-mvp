import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // _internal_ 접두어 파일 및 /heatmap/ 직접 접근 차단 (관리자 전용 콘텐츠)
  if (request.nextUrl.pathname.startsWith('/_internal_') ||
      request.nextUrl.pathname.startsWith('/heatmap/')) {
    // Referer가 /admin/(iframe 로드) 또는 /heatmap/(히트맵 내부 리소스 fetch)면 허용
    const referer = request.headers.get('referer') || ''
    const allowed = referer.includes('/admin/') || referer.includes('/heatmap/')
    if (!allowed) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // /admin 경로가 아니면 통과
  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

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
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/_internal_:path*', '/heatmap/:path*'],
}
