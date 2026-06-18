import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip auth processing for Next.js RSC prefetch requests.
  // Prefetch requests can consume the single-use Supabase refresh token before the
  // actual navigation, causing the navigation request to fail and redirect to /login.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch';
  if (isPrefetch) {
    return NextResponse.next({ request });
  }

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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Wrap getUser in try-catch: transient auth server errors should not log users out
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // If auth check fails due to network/transient error, pass through without redirecting
    return response;
  }

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

  // Fetch profile once for authenticated users on protected/auth routes (avoid 2 DB calls)
  let profile: { role: string; status_verifikasi: string; is_blocked: boolean } | null = null;
  if (user && (isAuthRoute || isDashboardRoute || isAdminRoute)) {
    try {
      const { data } = await supabase
        .from('users')
        .select('role, status_verifikasi, is_blocked')
        .eq('id', user.id)
        .single();
      profile = data;
    } catch {
      // DB errors should not log users out — let the page handle it
    }
  }

  // Redirect authenticated users away from auth routes
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    if (profile?.role === 'admin') {
      url.pathname = '/admin';
    } else if (profile?.role === 'industri') {
      url.pathname = '/dashboard-industri';
    } else {
      url.pathname = '/dashboard';
    }
    const redirectResponse = NextResponse.redirect(url);
    response.headers.getSetCookie().forEach(cookie => {
      redirectResponse.headers.append('Set-Cookie', cookie);
    });
    return redirectResponse;
  }

  // Protect dashboard and admin routes from unauthenticated users
  if (!user && (isDashboardRoute || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Protect dashboard and admin routes: check is_blocked + status_verifikasi
  if (user && (isDashboardRoute || isAdminRoute)) {
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
      const redirectResponse = NextResponse.redirect(url);
      response.headers.getSetCookie().forEach(cookie => {
        redirectResponse.headers.append('Set-Cookie', cookie);
      });
      return redirectResponse;
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
