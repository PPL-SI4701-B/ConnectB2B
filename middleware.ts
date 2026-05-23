import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // #region agent log
  const _dbgStart = Date.now();
  const _dbgPath = request.nextUrl.pathname;
  console.log(`[DBG:f49df7][H3-H4] middleware:entry path=${_dbgPath} method=${request.method} t=${_dbgStart}`);
  // #endregion

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

  // #region agent log
  const _dbgAuthT0 = Date.now();
  // #endregion
  const { data: { user } } = await supabase.auth.getUser()
  // #region agent log
  const _dbgAuthMs = Date.now() - _dbgAuthT0;
  console.log(`[DBG:f49df7][H3] middleware:getUser path=${_dbgPath} hasUser=${!!user} authMs=${_dbgAuthMs}`);
  // #endregion

  const isAuthRoute = 
    request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register');
  const isDashboardRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/dashboard-industri') ||
    request.nextUrl.pathname.startsWith('/pantau-transaksi') ||
    request.nextUrl.pathname.startsWith('/keranjang') ||
    request.nextUrl.pathname.startsWith('/profil') ||
    request.nextUrl.pathname.startsWith('/sewa-alat');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // #region agent log
  console.log(`[DBG:f49df7][H4] middleware:route-check path=${_dbgPath} isAuth=${isAuthRoute} isDashboard=${isDashboardRoute} isAdmin=${isAdminRoute} hasUser=${!!user}`);
  // #endregion

  // Redirect authenticated users away from auth routes
  if (user && isAuthRoute) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const url = request.nextUrl.clone();
    
    if (profile?.role === 'admin') {
      url.pathname = '/admin';
    } else if (profile?.role === 'industri') {
      url.pathname = '/dashboard-industri';
    } else {
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  // Protect dashboard and admin routes from unauthenticated users
  if (!user && (isDashboardRoute || isAdminRoute)) {
    console.log('[Middleware Redirect] No user found for path:', request.nextUrl.pathname);
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Protect dashboard routes from unverified users
  if (user && isDashboardRoute) {
    // #region agent log
    const _dbgDbT0 = Date.now();
    // #endregion
    const { data: profile } = await supabase.from('users').select('status_verifikasi, role').eq('id', user.id).single();
    // #region agent log
    const _dbgDbMs = Date.now() - _dbgDbT0;
    console.log(`[DBG:f49df7][H3] middleware:db-query path=${_dbgPath} dbMs=${_dbgDbMs} role=${profile?.role} status=${profile?.status_verifikasi}`);
    // #endregion
    
    if (profile && profile.role !== 'admin' && profile.status_verifikasi !== 'terverifikasi') {
      const url = request.nextUrl.clone()
      url.pathname = '/status-verifikasi'
      url.search = `?status=${profile.status_verifikasi}`
      return NextResponse.redirect(url)
    }
  }

  // #region agent log
  console.log(`[DBG:f49df7][H3] middleware:exit path=${_dbgPath} totalMs=${Date.now()-_dbgStart}`);
  // #endregion

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
