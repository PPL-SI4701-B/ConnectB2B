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

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register');
  const isDashboardRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/dashboard-industri') ||
    request.nextUrl.pathname.startsWith('/pantau-transaksi') ||
    request.nextUrl.pathname.startsWith('/keranjang') ||
    request.nextUrl.pathname.startsWith('/profil') ||
    request.nextUrl.pathname.startsWith('/sewa-alat') ||
    request.nextUrl.pathname.startsWith('/pencarian') ||
    request.nextUrl.pathname.startsWith('/request-masuk') ||
    request.nextUrl.pathname.startsWith('/beri-ulasan');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

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
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Protect dashboard and admin routes: check is_blocked + status_verifikasi
  if (user && (isDashboardRoute || isAdminRoute)) {
    const { data: profile } = await supabase
      .from('users')
      .select('status_verifikasi, role, is_blocked')
      .eq('id', user.id)
      .single();

    if (profile?.is_blocked) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '?error=blocked';
      const redirectResponse = NextResponse.redirect(url);
      response.headers.getSetCookie().forEach(cookie => {
        redirectResponse.headers.append('Set-Cookie', cookie);
      });
      return redirectResponse;
    }

    if (isDashboardRoute && profile && profile.role !== 'admin' && profile.status_verifikasi !== 'terverifikasi') {
      const url = request.nextUrl.clone();
      url.pathname = '/status-verifikasi';
      url.search = `?status=${profile.status_verifikasi}`;
      return NextResponse.redirect(url);
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
