import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('wip_access_token')?.value
  
  if (token !== 'granted') {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/done-items/:path*',
    '/api/upload/:path*',
  ],
}
