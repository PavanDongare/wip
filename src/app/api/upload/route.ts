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
    const uploadResults: Array<{ url: string; path: string; type: string }> = []
    const errors: Array<{ file: string; error: string }> = []

    for (const file of files) {
      // Validate file type
      if (!isValidFileType(file)) {
        errors.push({ file: file.name, error: 'Invalid file type. Only images and videos are allowed.' })
        continue
      }

      // Validate file size
      if (!isValidFileSize(file)) {
        errors.push({ file: file.name, error: 'File size exceeds 50MB limit.' })
        continue
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
        errors.push({ file: file.name, error: error.message })
        continue
      }

      uploadResults.push({
        url: getPublicUrl(data.path),
        path: data.path,
        type: file.type
      })
    }

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
