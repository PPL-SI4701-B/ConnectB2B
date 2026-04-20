import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // Protect dashboard and admin routes from unauthenticated users
  if (!user && (isDashboardRoute || isAdminRoute)) {
    console.log('[Middleware Redirect] No user found for path:', request.nextUrl.pathname);
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Protect dashboard routes from unverified users
  if (user && isDashboardRoute) {
    const { data: profile } = await supabase.from('users').select('status_verifikasi, role').eq('id', user.id).single();
    
    if (profile && profile.role !== 'admin' && profile.status_verifikasi !== 'terverifikasi') {
      const url = request.nextUrl.clone()
      url.pathname = '/status-verifikasi'
      url.search = `?status=${profile.status_verifikasi}`
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
