// Supabase Storage operations for the done-media bucket

export const STORAGE_BUCKET = 'done-media'
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes

export interface UploadResult {
  url: string
  path: string
}

export interface UploadError {
  error: string
  file?: string
}

// Get the public URL for a file in the done-media bucket
export function getPublicUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
}

// Generate a unique file path with sanitized filename
export function generateFilePath(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  // Extract extension
  const parts = originalName.split('.')
  const extension = parts.length > 1 ? parts.pop() : ''

  // Sanitize the filename: remove special chars, replace spaces with dashes
  const nameWithoutExt = parts.join('.')
  const sanitizedName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')  // Replace special chars with dashes
    .replace(/-+/g, '-')             // Replace multiple dashes with single
    .replace(/^-|-$/g, '')           // Remove leading/trailing dashes
    .substring(0, 50)                // Limit length

  return `${timestamp}-${random}-${sanitizedName}.${extension}`
}

// Validate file type (images and videos only)
export function isValidFileType(file: File): boolean {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
  return [...validImageTypes, ...validVideoTypes].includes(file.type)
}

// Validate file size
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE
}

// Check if a file is an image
export function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

// Check if a file is a video
export function isVideo(file: File): boolean {
  return file.type.startsWith('video/')
}

// Check if a URL is a video based on extension
export function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi']
  return videoExtensions.some(ext => url.toLowerCase().endsWith(ext))
}
