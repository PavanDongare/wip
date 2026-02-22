'use client'

import React, { useState, useEffect } from 'react'
import { HardHat, Construction, Lock, ArrowRight, ConstructionIcon, Paperclip, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { verifyPasscode, checkAccess } from '@/app/actions'

export function LandingPage({ onVerified }: { onVerified: () => void }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

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

      <footer className="py-12 px-6 text-center text-stone-400 text-xs font-medium tracking-widest uppercase">
        WIP // {new Date().getFullYear()}
      </footer>
    </div>
  )
}

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null)

  useEffect(() => {
    async function initAccess() {
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
