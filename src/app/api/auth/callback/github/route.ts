import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  
  const savedState = request.cookies.get('oauth_state')?.value
  
  // Verify state (CSRF protection)
  if (!state || state !== savedState) {
    return new NextResponse('Invalid state parameter (CSRF match failed)', { status: 400 })
  }
  
  if (!code) {
    return new NextResponse('Authorization code missing', { status: 400 })
  }
  
  const client_id = process.env.GITHUB_CLIENT_ID
  const client_secret = process.env.GITHUB_CLIENT_SECRET
  const authorized_user = process.env.AUTHORIZED_GITHUB_USER
  
  if (!client_id || !client_secret || !authorized_user) {
    return new NextResponse('GitHub OAuth not fully configured on server', { status: 500 })
  }
  
  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    })
    
    const tokenData = await tokenRes.json()
    const access_token = tokenData.access_token
    
    if (!access_token) {
      return new NextResponse('Failed to exchange code for token', { status: 400 })
    }
    
    // Fetch GitHub user details
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'User-Agent': 'wip-app',
      },
    })
    
    const userData = await userRes.json()
    const username = userData.login
    
    if (!username) {
      return new NextResponse('Failed to fetch user profile from GitHub', { status: 400 })
    }
    
    // Check if user is authorized
    if (username.toLowerCase() !== authorized_user.toLowerCase()) {
      return new NextResponse('Unauthorized GitHub account', { status: 403 })
    }
    
    // Authorization successful! Grant access
    const origin = new URL(request.url).origin
    const response = NextResponse.redirect(new URL('/', origin))
    
    response.cookies.set('wip_access_token', 'granted', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    
    // Clear oauth_state cookie
    response.cookies.delete('oauth_state')
    
    return response
    
  } catch (error) {
    console.error('OAuth callback error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
