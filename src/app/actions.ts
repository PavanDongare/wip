'use server'

import { cookies } from 'next/headers'

export async function verifyPasscode(passcode: string) {
  const expectedPasscode = process.env.APP_PASSCODE || '1234'
  
  if (passcode === expectedPasscode) {
    const cookieStore = await cookies()
    cookieStore.set('wip_access_token', 'granted', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return { success: true }
  }
  
  return { success: false }
}

export async function checkAccess() {
  const cookieStore = await cookies()
  return cookieStore.get('wip_access_token')?.value === 'granted'
}

export async function isGitHubAuthEnabled() {
  return !!(
    process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET &&
    process.env.AUTHORIZED_GITHUB_USER
  )
}

