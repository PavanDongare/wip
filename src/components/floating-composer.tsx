'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface FloatingComposerProps {
  onSend: (content: string, files: File[], previewUrls: string[]) => void
  disabled?: boolean
}

type Mode = 'idle' | 'radial' | 'camera' | 'photo' | 'text'

interface SelectedFile {
  file: File
  preview: string
  isVideo: boolean
}

export function FloatingComposer({ onSend, disabled }: FloatingComposerProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const stopCamera = useCallback(() => {
    const stream = cameraStreamRef.current
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      cameraStreamRef.current = null
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null
    }
  }, [])

  // Auto-focus textarea when sheet opens
  useEffect(() => {
    if (mode === 'photo' || mode === 'text') {
      const timer = setTimeout(() => textareaRef.current?.focus(), 320)
      return () => clearTimeout(timer)
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'camera') {
      stopCamera()
      return
    }

    let cancelled = false
    setCameraError(null)

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera capture is not available here.')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        cameraStreamRef.current = stream
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream
          await cameraVideoRef.current.play().catch(() => {})
        }
      } catch (error) {
        console.error('Failed to open camera:', error)
        setCameraError('Camera permission was denied or unavailable.')
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [mode, stopCamera])

  const openCamera = () => {
    if (disabled) return
    setMode('camera')
  }

  const openText = () => setMode('text')

  const openFilePicker = () => {
    setMode('idle')
    setTimeout(() => fileInputRef.current?.click(), 50)
  }

  const handleCapture = async () => {
    const video = cameraVideoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })

    if (!blob) return

    const file = new File([blob], `wip-${Date.now()}.jpg`, { type: 'image/jpeg' })
    const preview = URL.createObjectURL(blob)

    setSelectedFile(prev => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return { file, preview, isVideo: false }
    })

    stopCamera()
    setMode('photo')
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setSelectedFile(prev => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return { file, preview, isVideo: file.type.startsWith('video/') }
    })
    setMode('photo')
    if (e.target) e.target.value = ''
  }

  const handleSend = () => {
    if (!content.trim() && !selectedFile) return
    const files = selectedFile ? [selectedFile.file] : []
    const previews = selectedFile ? [selectedFile.preview] : []
    onSend(content, files, previews)
    handleClose()
  }

  const handleClose = () => {
    stopCamera()
    if (selectedFile) URL.revokeObjectURL(selectedFile.preview)
    setSelectedFile(null)
    setContent('')
    setCameraError(null)
    setMode('idle')
  }

  const isSheetOpen = mode === 'photo' || mode === 'text'
  const isOpen = mode !== 'idle'

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          onClick={handleClose}
        />
      )}

      {/* Radial pop-up options */}
      {mode === 'radial' && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
          {/* TEXT NOTE option */}
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-200">
            <button
              onClick={openText}
              className="flex items-center gap-3 bg-yellow-300 border-4 border-stone-900 px-5 py-3 font-black text-sm uppercase tracking-tight text-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-95"
            >
              ✍️ NOTE
            </button>
          </div>
          {/* PHOTO option */}
          <div className="animate-in slide-in-from-bottom-2 fade-in duration-150">
            <button
              onClick={openCamera}
              className="flex items-center gap-3 bg-white border-4 border-stone-900 px-5 py-3 font-black text-sm uppercase tracking-tight text-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-95"
            >
              📷 PHOTO
            </button>
          </div>
        </div>
      )}

      {/* Camera capture */}
      {mode === 'camera' && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="mx-auto w-full max-w-2xl border-x-4 border-t-4 border-stone-900 bg-white shadow-[0_-6px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-4 border-stone-900 bg-yellow-300 px-4 py-3">
              <div className="font-black text-sm uppercase tracking-tight text-stone-900">
                Camera
              </div>
              <button
                onClick={handleClose}
                className="h-10 w-10 border-4 border-stone-900 bg-white text-stone-900 font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                aria-label="Close camera"
              >
                ×
              </button>
            </div>

            <div className="relative bg-black" style={{ aspectRatio: '4 / 5' }}>
              <video
                ref={cameraVideoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-950/90 p-6">
                  <div className="max-w-sm border-4 border-stone-900 bg-yellow-300 p-4 text-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <p className="font-black text-sm uppercase tracking-tight">
                      Camera unavailable
                    </p>
                    <p className="mt-2 text-sm font-medium leading-snug">
                      {cameraError}
                    </p>
                    <button
                      onClick={openFilePicker}
                      className="mt-4 w-full border-4 border-stone-900 bg-white px-4 py-3 font-black text-sm uppercase tracking-tight text-stone-900 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    >
                      Choose file
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4">
              <button
                onClick={handleClose}
                className="flex-1 border-4 border-stone-900 bg-stone-100 px-4 py-4 font-black text-sm uppercase tracking-tight text-stone-900 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                disabled={!!cameraError}
                className={cn(
                  'flex-[2] border-4 border-stone-900 px-4 py-4 font-black text-sm uppercase tracking-tight shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all',
                  cameraError
                    ? 'cursor-not-allowed bg-stone-200 text-stone-400 opacity-60'
                    : 'bg-yellow-300 text-stone-900'
                )}
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      {isSheetOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
          {/* Chunky brutalist top border */}
          <div className="bg-white border-t-4 border-x-4 border-stone-900 shadow-[0_-6px_0px_rgba(0,0,0,1)] max-w-2xl mx-auto w-full">

            {/* Image preview */}
            {selectedFile && (
              <div className="relative w-full" style={{ maxHeight: '45vh', overflow: 'hidden' }}>
                {selectedFile.isVideo ? (
                  <video
                    src={selectedFile.preview}
                    className="w-full object-cover"
                    style={{ maxHeight: '45vh' }}
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedFile.preview}
                    alt=""
                    className="w-full object-cover"
                    style={{ maxHeight: '45vh' }}
                  />
                )}
                {/* Gradient for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Caption / Note textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={selectedFile ? "Caption (optional)…" : "What did you get done?"}
                  rows={selectedFile ? 2 : 4}
                  className="w-full resize-none border-0 border-b-4 border-stone-900 focus:outline-none font-mono text-lg text-stone-900 bg-transparent placeholder:text-stone-400 placeholder:font-light leading-snug pb-2"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && selectedFile) {
                      e.preventDefault()
                      handleSend()
                    }
                    if (e.key === 'Escape') handleClose()
                  }}
                />
              </div>

              <div className="flex gap-3">
                {/* Swap photo if already selected */}
                {selectedFile && (
                  <button
                    onClick={openCamera}
                    className="flex-none px-4 py-4 bg-stone-100 border-4 border-stone-900 font-black text-xs uppercase tracking-tight text-stone-700 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-95"
                    title="Change photo"
                  >
                    📷
                  </button>
                )}

                {/* POST button */}
                <button
                  onClick={handleSend}
                  disabled={!content.trim() && !selectedFile}
                  className={cn(
                    "flex-1 py-4 font-black text-lg uppercase tracking-tight border-4 border-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:scale-95",
                    content.trim() || selectedFile
                      ? "bg-yellow-300 text-stone-900"
                      : "bg-stone-200 text-stone-400 opacity-60 cursor-not-allowed"
                  )}
                >
                  POST IT →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          if (isSheetOpen || mode === 'radial') {
            handleClose()
          } else {
            setMode('radial')
          }
        }}
        disabled={disabled}
        aria-label={isOpen ? 'Close' : 'Add new entry'}
        className={cn(
          'fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full border-4 border-stone-900 font-black text-2xl leading-none flex items-center justify-center',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]',
          'transition-all duration-200 active:scale-95 select-none',
          isOpen ? 'bg-stone-900 text-yellow-300 rotate-45' : 'bg-yellow-300 text-stone-900 rotate-0'
        )}
      >
        +
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
    </>
  )
}
