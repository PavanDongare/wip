import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const client_id = process.env.GITHUB_CLIENT_ID
  if (!client_id) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 })
  }

  // Generate a random state parameter for CSRF protection
  const state = Math.random().toString(36).substring(2, 15)

  // Redirect to GitHub OAuth consent page
  const origin = new URL(request.url).origin
  const redirect_uri = `${origin}/api/auth/callback/github`
  
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=user&state=${state}`
  
  const response = NextResponse.redirect(githubUrl)
  
  // Save state in cookie to verify on callback
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return response
}
