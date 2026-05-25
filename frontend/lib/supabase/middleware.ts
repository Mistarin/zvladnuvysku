import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // DŮLEŽITÉ: Nesmíme přidávat kód mezi createServerClient a getUser()
  // viz: https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/prihlaseni') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // Chráněné stránky přesměrujeme na login (zatím žádné — vše veřejné pro čtení)
    // Uncomment pro chráněné routy:
    // const url = request.nextUrl.clone()
    // url.pathname = '/prihlaseni'
    // return NextResponse.redirect(url)
  }

  return supabaseResponse
}
