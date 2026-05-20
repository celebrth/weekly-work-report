import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
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
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Protect dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!user || userError) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Safer error handling when fetching the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || !profile.role) {
        // If profile fetch fails or role is missing, fail safely to login
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const role = profile.role

      // If visiting /dashboard directly, redirect to correct role dashboard
      if (request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/dashboard/') {
        return NextResponse.redirect(new URL(`/dashboard/${role}`, request.url))
      }

      // Prevent members from accessing leader routes
      if (request.nextUrl.pathname.startsWith('/dashboard/leader') && role !== 'leader') {
        return NextResponse.redirect(new URL('/dashboard/member', request.url))
      }

      // Prevent leaders from accessing member routes
      if (request.nextUrl.pathname.startsWith('/dashboard/member') && role !== 'member') {
        return NextResponse.redirect(new URL('/dashboard/leader', request.url))
      }
    }

    // Redirect logged-in users away from auth pages
    if (user && request.nextUrl.pathname.startsWith('/login')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        
      if (profile && profile.role) {
        return NextResponse.redirect(new URL(`/dashboard/${profile.role}`, request.url))
      }
    }

    return response
  } catch (err) {
    console.error('[Middleware Error] Runtime error occurred:', err)
    // Re-throw or return a valid response, here we return a 500 error response safely
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
