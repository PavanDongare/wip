'use client'

import Image from 'next/image'
import { format } from 'date-fns'
import { isVideoUrl } from '@/lib/supabase/storage'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface MediaGridProps {
  mediaUrls: string[]
  className?: string
  capturedAt?: string
}

function MediaImage({ src, alt, width, height, className }: {
  src: string; alt: string; width: number; height: number; className: string
}) {
  if (src.startsWith('blob:')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />
  }
  return <Image src={src} alt={alt} width={width} height={height} className={className} />
}

function formatCapturedAt(capturedAt?: string) {
  if (!capturedAt) return null
  const date = new Date(capturedAt)
  if (Number.isNaN(date.getTime())) return null
  return format(date, 'd MMM yy')
}

function Thumbnail({ url, overlayLabel }: { url: string; overlayLabel?: string | null }) {
  const video = isVideoUrl(url)
  const isBlob = url.startsWith('blob:')

  if (video) {
    return (
      <video src={url} muted className="h-full w-full object-cover" />
    )
  }

  if (isBlob) {
    return (
      <ExpandedImage src={url} alt="" overlayLabel={overlayLabel}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
      </ExpandedImage>
    )
  }

  return (
    <ExpandedImage src={url} alt="" overlayLabel={overlayLabel}>
      <MediaImage
        src={url}
        alt=""
        width={200}
        height={200}
        className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
      />
    </ExpandedImage>
  )
}

export function MediaGrid({ mediaUrls, className, capturedAt }: MediaGridProps) {
  if (!mediaUrls || mediaUrls.length === 0) {
    return null
  }

  const count = mediaUrls.length
  const isSingle = count === 1
  const capturedLabel = formatCapturedAt(capturedAt)

  // Single image: show as is
  if (isSingle) {
    return (
      <div className={cn('relative rounded-2xl overflow-hidden bg-muted', className || 'h-40 w-40 shrink-0')}>
        {capturedLabel && (
          <div className="absolute left-3 top-3 z-20 bg-yellow-300 text-stone-900 border-2 border-stone-900 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
            {capturedLabel}
          </div>
        )}
        <Thumbnail url={mediaUrls[0]} overlayLabel={capturedLabel} />
      </div>
    )
  }

  // Multiple images: horizontal scrollable strip
  return (
    <div className={cn('relative flex gap-1.5 overflow-x-auto pb-2', className)}>
      {capturedLabel && (
        <div className="absolute left-2 top-2 z-20 bg-yellow-300 text-stone-900 border-2 border-stone-900 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
          {capturedLabel}
        </div>
      )}
      {mediaUrls.map((url, index) => (
        <div
          key={index}
          className="relative h-40 w-40 shrink-0 rounded-2xl overflow-hidden bg-muted"
        >
          <Thumbnail url={url} overlayLabel={capturedLabel} />
        </div>
      ))}
    </div>
  )
}

function ExpandedImage({
  src,
  alt,
  children,
  overlayLabel,
}: {
  src: string
  alt: string
  children: React.ReactNode
  overlayLabel?: string | null
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent
        className="!fixed !inset-0 !left-0 !top-0 !z-50 grid h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-stone-950/95 p-0 shadow-none"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          <div className="relative z-10 w-full max-w-6xl px-4 py-6 md:px-10 md:py-10">
            <div className="relative overflow-hidden rounded-[1.25rem] border-4 border-stone-900 bg-black shadow-[12px_12px_0px_rgba(0,0,0,0.75)]">
              {overlayLabel && (
                <div className="absolute left-4 top-4 z-20 bg-yellow-300 text-stone-900 border-2 border-stone-900 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
                  {overlayLabel}
                </div>
              )}

              {src.startsWith('blob:') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={alt} className="max-h-[84dvh] w-full object-contain bg-black" />
              ) : (
                <Image
                  src={src}
                  alt={alt}
                  width={1600}
                  height={1200}
                  className="max-h-[84dvh] w-full object-contain bg-black"
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
