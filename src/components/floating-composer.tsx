'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingComposerProps {
  onSend: (content: string, files: File[], previewUrls: string[]) => void
  disabled?: boolean
}

type VoiceState = 'idle' | 'recording'

interface SelectedFile {
  file: File
  preview: string
  isVideo: boolean
}

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      length: number
      [index: number]: {
        transcript: string
      }
    }
  }
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export function FloatingComposer({ onSend, disabled }: FloatingComposerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const transcriptRef = useRef('')
  const voiceMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearVoiceMessage = useCallback(() => {
    if (voiceMessageTimerRef.current) {
      clearTimeout(voiceMessageTimerRef.current)
      voiceMessageTimerRef.current = null
    }
    setVoiceMessage(null)
  }, [])

  const showVoiceMessage = useCallback(
    (message: string) => {
      clearVoiceMessage()
      setVoiceMessage(message)
      voiceMessageTimerRef.current = setTimeout(() => {
        setVoiceMessage(null)
        voiceMessageTimerRef.current = null
      }, 2200)
    },
    [clearVoiceMessage]
  )

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

  const closeVoiceRecognition = useCallback((commitTranscript: boolean) => {
    const recognition = recognitionRef.current
    recognitionRef.current = null

    if (!recognition) {
      setVoiceState('idle')
      return
    }

    if (!commitTranscript) {
      recognition.abort()
      setVoiceState('idle')
      return
    }

    recognition.stop()
  }, [])

  const captureFrame = useCallback(async () => {
    const video = cameraVideoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      showVoiceMessage('Camera is still starting.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

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
  }, [showVoiceMessage])

  useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen, stopCamera])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => textareaRef.current?.focus(), 220)
    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeComposer()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    return () => {
      stopCamera()
      recognitionRef.current?.abort()
      if (voiceMessageTimerRef.current) {
        clearTimeout(voiceMessageTimerRef.current)
      }
    }
  }, [stopCamera])

  const openComposer = () => {
    if (disabled) return
    setIsOpen(true)
  }

  const closeComposer = () => {
    stopCamera()
    recognitionRef.current?.abort()
    clearVoiceMessage()
    if (selectedFile) URL.revokeObjectURL(selectedFile.preview)
    setSelectedFile(null)
    setContent('')
    setCameraError(null)
    setVoiceState('idle')
    transcriptRef.current = ''
    setIsOpen(false)
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handlePreviewTap = async () => {
    if (cameraError) {
      openFilePicker()
      return
    }
    await captureFrame()
  }

  const startVoiceInput = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (voiceState !== 'idle' || disabled) return

    const Recognition = getSpeechRecognitionConstructor()
    if (!Recognition) {
      showVoiceMessage('Voice input is not available here.')
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    transcriptRef.current = ''
    clearVoiceMessage()
    setVoiceState('recording')

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = resultEvent => {
      let transcript = ''
      for (let i = 0; i < resultEvent.results.length; i += 1) {
        const result = resultEvent.results[i]
        if (result?.[0]?.transcript) {
          transcript += ` ${result[0].transcript}`
        }
      }
      transcriptRef.current = transcript.trim()
    }

    recognition.onerror = () => {
      recognitionRef.current = null
      setVoiceState('idle')
      showVoiceMessage('Voice input stopped.')
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setVoiceState('idle')

      const transcript = transcriptRef.current.trim().replace(/\s+/g, ' ')
      if (!transcript) return

      setContent(prev => {
        const next = prev.trim()
        return next ? `${next} ${transcript}` : transcript
      })
      showVoiceMessage('Added voice text.')
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setVoiceState('idle')
      showVoiceMessage('Could not start voice input.')
    }
  }

  const finishVoiceInput = () => {
    if (voiceState !== 'recording') return
    closeVoiceRecognition(true)
  }

  const cancelVoiceInput = () => {
    if (voiceState !== 'recording') return
    transcriptRef.current = ''
    closeVoiceRecognition(false)
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    setSelectedFile(prev => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return { file, preview, isVideo: file.type.startsWith('video/') }
    })
    if (e.target) e.target.value = ''
  }

  const handleSend = () => {
    if (!content.trim() && !selectedFile) return

    const files = selectedFile ? [selectedFile.file] : []
    const previews = selectedFile ? [selectedFile.preview] : []
    onSend(content, files, previews)
    closeComposer()
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={closeComposer} />
      )}

      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="mx-auto w-full max-w-2xl border-x-4 border-t-4 border-stone-900 bg-white shadow-[0_-6px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-4 border-stone-900 bg-yellow-300 px-4 py-3">
              <div className="font-black text-sm uppercase tracking-tight text-stone-900">
                New item
              </div>
            </div>

            <button
              type="button"
              onClick={handlePreviewTap}
              className="relative block w-full overflow-hidden bg-black text-left"
              aria-label={cameraError ? 'Choose an image' : 'Tap image to capture'}
            >
              {selectedFile ? (
                selectedFile.isVideo ? (
                  <video
                    src={selectedFile.preview}
                    className="h-full w-full object-cover"
                    style={{ aspectRatio: '4 / 5', maxHeight: '45vh' }}
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
                    className="h-full w-full object-cover"
                    style={{ aspectRatio: '4 / 5', maxHeight: '45vh' }}
                  />
                )
              ) : cameraError ? (
                <div
                  className="flex h-full items-center justify-center bg-stone-950 px-6 py-12 text-center"
                  style={{ aspectRatio: '4 / 5', maxHeight: '45vh' }}
                >
                  <div className="max-w-xs border-4 border-stone-900 bg-yellow-300 p-4 text-stone-900 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <p className="font-black text-sm uppercase tracking-tight">Camera unavailable</p>
                    <p className="mt-2 text-sm font-medium leading-snug">{cameraError}</p>
                    <span className="mt-4 inline-flex items-center gap-2 border-4 border-stone-900 bg-white px-4 py-2 font-black text-xs uppercase tracking-tight text-stone-900 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                      <Camera className="h-4 w-4" />
                      Choose image
                    </span>
                  </div>
                </div>
              ) : (
                <video
                  ref={cameraVideoRef}
                  className="h-full w-full object-cover"
                  style={{ aspectRatio: '4 / 5', maxHeight: '45vh' }}
                  autoPlay
                  muted
                  playsInline
                />
              )}
            </button>

            <div className="p-4 space-y-4">
              {voiceMessage && (
                <div className="border-4 border-stone-900 bg-yellow-300 px-3 py-2 font-black text-xs uppercase tracking-tight text-stone-900 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  {voiceMessage}
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Title or caption (optional)"
                  rows={3}
                  className="w-full resize-none border-0 border-b-4 border-stone-900 bg-transparent pb-2 pr-14 font-mono text-lg leading-snug text-stone-900 placeholder:font-light placeholder:text-stone-400 focus:outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && (content.trim() || selectedFile)) {
                      e.preventDefault()
                      handleSend()
                    }
                    if (e.key === 'Escape') closeComposer()
                  }}
                />
                <button
                  type="button"
                  onPointerDown={startVoiceInput}
                  onPointerUp={finishVoiceInput}
                  onPointerCancel={cancelVoiceInput}
                  onPointerLeave={finishVoiceInput}
                  disabled={disabled}
                  className={cn(
                    'absolute right-0 top-0 grid h-11 w-11 place-items-center border-4 border-stone-900 shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all active:scale-95',
                    voiceState === 'recording'
                      ? 'bg-stone-900 text-yellow-300'
                      : 'bg-yellow-300 text-stone-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                  )}
                  aria-label="Hold to dictate"
                  title="Hold to dictate"
                >
                  <Mic className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>

              <button
                onClick={handleSend}
                disabled={!content.trim() && !selectedFile}
                className={cn(
                  'w-full border-4 border-stone-900 px-4 py-4 font-black text-sm uppercase tracking-tight shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all active:scale-95',
                  selectedFile ? 'bg-yellow-300 text-stone-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'bg-white text-stone-900 hover:bg-stone-50',
                  !content.trim() && !selectedFile && 'cursor-not-allowed bg-stone-200 text-stone-400 opacity-60'
                )}
              >
                {selectedFile ? 'POST IMAGE' : 'SAVE TEXT'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={isOpen ? closeComposer : openComposer}
        disabled={disabled}
        aria-label={isOpen ? 'Close composer' : 'Add new entry'}
        className={cn(
          'fixed bottom-6 right-4 z-50 grid h-14 w-14 place-items-center rounded-full border-4 border-stone-900 text-2xl leading-none shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-200 active:scale-95 select-none',
          isOpen ? 'rotate-45 bg-stone-900 text-yellow-300' : 'bg-yellow-300 text-stone-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
        )}
      >
        +
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
    </>
  )
}
