'use client'

import React, { useState, useEffect } from 'react'
import { HardHat, Construction, Lock, ArrowRight, ConstructionIcon, Paperclip, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { verifyPasscode, checkAccess, isGitHubAuthEnabled } from '@/app/actions'

export function LandingPage({ onVerified }: { onVerified: () => void }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isGitHubEnabled, setIsGitHubEnabled] = useState(false)

  useEffect(() => {
    async function checkGitHub() {
      const enabled = await isGitHubAuthEnabled()
      setIsGitHubEnabled(enabled)
    }
    checkGitHub()
  }, [])

  const handleGitHubLogin = () => {
    window.location.href = '/api/auth/github'
  }

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setIsVerifying(true)
    
    try {
      const result = await verifyPasscode(passcode)
      if (result.success) {
        onVerified()
      } else {
        setError(true)
        setTimeout(() => setError(false), 2000)
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError(true)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-yellow-200">
      {/* Simple Header */}
      <header className="bg-yellow-300 border-b-4 border-stone-900 px-6 py-12 md:py-20 relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <ConstructionIcon size={20} className="text-stone-900" />
            <span className="font-bold uppercase tracking-tight text-sm">Personal Dev Log</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-stone-900 mb-4 leading-none">
            WIP_
          </h1>
          <p className="text-lg md:text-xl font-medium text-stone-800 max-w-lg">
            A simple, private stream for tracking daily progress, bugs, and breakthroughs.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Simple Bullet Points with Icons */}
        <section className="grid gap-8 mb-16">
          <div className="flex items-start gap-4">
            <div className="mt-1 p-2 bg-yellow-100 rounded-lg text-yellow-700">
              <Paperclip size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Quick Logs</h3>
              <p className="text-stone-600">Chat-style interface for fast updates and media attachments.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-1 p-2 bg-yellow-100 rounded-lg text-yellow-700">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Timeline View</h3>
              <p className="text-stone-600">Chronological history of work done, searchable by date.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-1 p-2 bg-yellow-100 rounded-lg text-yellow-700">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Private Access</h3>
              <p className="text-stone-600">Passcode-protected workspace for personal dev notes.</p>
            </div>
          </div>
        </section>

        {/* Access Section */}
        <section className="pt-12 border-t-2 border-stone-200">
          <div className="max-w-sm mx-auto text-center">
            <h2 className="text-2xl font-bold mb-6">Enter Workspace</h2>
            
            {isGitHubEnabled && (
              <div className="mb-6">
                <Button
                  type="button"
                  onClick={handleGitHubLogin}
                  className="w-full h-12 bg-[#24292e] text-white hover:bg-[#1f2327] rounded-none font-bold flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Sign in with GitHub
                </Button>
                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-stone-200"></div>
                  <span className="px-3 text-stone-400 text-xs font-semibold uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-stone-200"></div>
                </div>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isVerifying}
                className={cn(
                  "h-12 bg-white border-2 text-center text-xl tracking-[0.5em] font-mono rounded-none",
                  error ? "border-red-500 bg-red-50" : "border-stone-200 focus:border-yellow-400"
                )}
              />
              <Button 
                type="submit"
                disabled={isVerifying}
                className="w-full h-12 bg-stone-900 text-yellow-300 hover:bg-stone-800 rounded-none font-bold"
              >
                {isVerifying ? 'Verifying...' : 'Unlock'}
              </Button>
              {error && <p className="text-red-500 text-xs font-bold">INCORRECT PASSCODE</p>}
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null)

  useEffect(() => {
    async function initAccess() {
      // Check for token/passcode in URL query parameter (Magic Link)
      const searchParams = new URLSearchParams(window.location.search)
      const token = searchParams.get('token') || searchParams.get('passcode')
      if (token) {
        try {
          const result = await verifyPasscode(token)
          if (result.success) {
            setIsVerified(true)
            // Remove the token from the URL to keep it clean and secure
            const newUrl = window.location.pathname + window.location.hash
            window.history.replaceState({}, document.title, newUrl)
            return
          }
        } catch (err) {
          console.error('Failed to verify URL token:', err)
        }
      }

      const hasAccess = await checkAccess()
      setIsVerified(hasAccess)
    }
    initAccess()
  }, [])

  if (isVerified === null) return null // Wait for hydration

  if (!isVerified) {
    return <LandingPage onVerified={() => setIsVerified(true)} />
  }

  return <>{children}</>
}
