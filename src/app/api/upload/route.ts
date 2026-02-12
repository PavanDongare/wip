import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STORAGE_BUCKET, generateFilePath, getPublicUrl, isValidFileType, isValidFileSize } from '@/lib/supabase/storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const supabase = createClient()

    // Upload all files in parallel
    const results = await Promise.all(
      files.map(async (file) => {
        if (!isValidFileType(file)) {
          return { error: { file: file.name, error: 'Invalid file type. Only images and videos are allowed.' } }
        }

        if (!isValidFileSize(file)) {
          return { error: { file: file.name, error: 'File size exceeds 50MB limit.' } }
        }

        const filePath = generateFilePath(file.name)
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false
          })

        if (error) {
          return { error: { file: file.name, error: error.message } }
        }

        return {
          result: {
            url: getPublicUrl(data.path),
            path: data.path,
            type: file.type
          }
        }
      })
    )

    const uploadResults = results
      .filter((r): r is { result: { url: string; path: string; type: string } } => 'result' in r)
      .map(r => r.result)

    const errors = results
      .filter((r): r is { error: { file: string; error: string } } => 'error' in r)
      .map(r => r.error)

    return NextResponse.json({
      files: uploadResults,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}
