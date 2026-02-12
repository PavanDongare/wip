'use client'

import { useState } from 'react'
import Image from 'next/image'
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

function Thumbnail({ url }: { url: string }) {
  const video = isVideoUrl(url)
  const isBlob = url.startsWith('blob:')

  if (video) {
    return (
      <video src={url} muted className="h-full w-full object-cover" />
    )
  }

  if (isBlob) {
    return (
      <ExpandedImage src={url} alt="">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
      </ExpandedImage>
    )
  }

  return (
    <ExpandedImage src={url} alt="">
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

export function MediaGrid({ mediaUrls, className }: MediaGridProps) {
  if (!mediaUrls || mediaUrls.length === 0) {
    return null
  }

  const count = mediaUrls.length
  const isSingle = count === 1

  // Single image: show as is
  if (isSingle) {
    return (
      <div className={cn('relative h-40 w-40 shrink-0 rounded-lg overflow-hidden bg-muted', className)}>
        <Thumbnail url={mediaUrls[0]} />
      </div>
    )
  }

  // Multiple images: horizontal scrollable strip
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto pb-2', className)}>
      {mediaUrls.map((url, index) => (
        <div
          key={index}
          className="relative h-40 w-40 shrink-0 rounded-lg overflow-hidden bg-muted"
        >
          <Thumbnail url={url} />
        </div>
      ))}
    </div>
  )
}

function ExpandedImage({ src, alt, children }: { src: string; alt: string; children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none" showCloseButton={true}>
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        {src.startsWith('blob:') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="w-full h-auto rounded-lg" />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={800}
            className="w-full h-auto rounded-lg"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
