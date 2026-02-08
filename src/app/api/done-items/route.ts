import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET /api/done-items - Fetch items with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const supabase = createClient()

    // @ts-ignore - Custom schema type limitations with wip schema
    let query = supabase
      .from('done_items')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply date filters if provided
    if (startDate) {
      // @ts-ignore
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      // @ts-ignore
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      )
    }

    // Check if there are more items
    const hasMore = data && data.length === limit

    return NextResponse.json({
      items: data || [],
      hasMore
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/done-items - Create new item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, mediaUrls } = body

    const supabase = createClient()

    const newItem: any = {
      content: content || null,
      media_urls: mediaUrls && mediaUrls.length > 0 ? mediaUrls : null
    }

    // @ts-ignore - Custom schema type limitations with wip schema
    const query = supabase.from('done_items').insert(newItem).select().single()
    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create item' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
