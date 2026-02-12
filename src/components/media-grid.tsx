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

export function MediaGrid({ mediaUrls, className }: MediaGridProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (!mediaUrls || mediaUrls.length === 0) {
    return null
  }

  const count = mediaUrls.length
  const firstItem = mediaUrls[0]
  const isVideo = isVideoUrl(firstItem)

  // Single item
  if (count === 1) {
    return (
      <div className={cn('rounded-lg overflow-hidden bg-muted', className)}>
        {isVideo ? (
          <video
            src={firstItem}
            controls
            className="w-full max-h-96 object-contain"
          />
        ) : firstItem.startsWith('blob:') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstItem}
            alt=""
            className="w-full h-auto object-cover max-h-96"
          />
        ) : (
          <ExpandedImage src={firstItem} alt="">
            <MediaImage
              src={firstItem}
              alt=""
              width={600}
              height={400}
              className="w-full h-auto object-cover max-h-96 cursor-pointer hover:opacity-90 transition-opacity"
            />
          </ExpandedImage>
        )}
      </div>
    )
  }

  // Two items - side by side
  if (count === 2) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 rounded-lg overflow-hidden', className)}>
        {mediaUrls.map((url, index) => {
          const video = isVideoUrl(url)
          return (
            <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
              {video ? (
                <video
                  src={url}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : url.startsWith('blob:') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ExpandedImage src={url} alt="">
                  <MediaImage
                    src={url}
                    alt=""
                    width={300}
                    height={300}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </ExpandedImage>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Three or four items - 2x2 grid
  if (count <= 4) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 rounded-lg overflow-hidden', className)}>
        {mediaUrls.map((url, index) => {
          const video = isVideoUrl(url)
          return (
            <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
              {video ? (
                <video
                  src={url}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : url.startsWith('blob:') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ExpandedImage src={url} alt="">
                  <MediaImage
                    src={url}
                    alt=""
                    width={300}
                    height={300}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </ExpandedImage>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // More than 4 items - show first 4 in grid with overlay
  return (
    <div className={cn('grid grid-cols-2 gap-2 rounded-lg overflow-hidden', className)}>
      {mediaUrls.slice(0, 4).map((url, index) => {
        const video = isVideoUrl(url)
        const isLast = index === 3 && count > 4
        return (
          <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden relative">
            {video ? (
              <video
                src={url}
                controls
                className="w-full h-full object-cover"
              />
            ) : url.startsWith('blob:') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ExpandedImage src={url} alt="">
                <MediaImage
                  src={url}
                  alt=""
                  width={300}
                  height={300}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </ExpandedImage>
            )}
            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-2xl font-semibold">+{count - 4}</span>
              </div>
            )}
          </div>
        )
      })}
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
