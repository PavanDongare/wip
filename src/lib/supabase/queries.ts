import type { DoneItem, DoneItemInsert, DoneItemUpdate } from './types'

export interface GetDoneItemsOptions {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

export interface GetDoneItemsResult {
  items: DoneItem[]
  hasMore: boolean
}

// SQL queries for the done_items table
export const doneItemsQueries = {
  // Get items with pagination
  getItems: (options: GetDoneItemsOptions = {}) => {
    const { limit = 20, offset = 0, startDate, endDate } = options

    let query = `
      SELECT id, content, media_urls, created_at
      FROM wip.done_items
    `

    const conditions: string[] = []
    if (startDate) conditions.push(`created_at >= '${startDate}'`)
    if (endDate) conditions.push(`created_at <= '${endDate}'`)

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`

    return query
  },

  // Get count for pagination
  getCount: (startDate?: string, endDate?: string) => {
    let query = `SELECT COUNT(*) as count FROM wip.done_items`

    if (startDate || endDate) {
      const conditions: string[] = []
      if (startDate) conditions.push(`created_at >= '${startDate}'`)
      if (endDate) conditions.push(`created_at <= '${endDate}'`)
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    return query
  },

  // Insert new item
  insert: (item: DoneItemInsert) => {
    const columns: string[] = []
    const values: string[] = []

    if (item.content !== undefined) {
      columns.push('content')
      values.push(`'${(item.content || '').replace(/'/g, "''")}'`)
    }
    if (item.media_urls !== undefined) {
      columns.push('media_urls')
      const urlsArray = (item.media_urls || []).map(u => `"${u}"`).join(',')
      values.push(`ARRAY[${urlsArray}]::text[]`)
    }

    const query = `
      INSERT INTO wip.done_items (${columns.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING id, content, media_urls, created_at
    `

    return query
  },

  // Update item
  update: (id: string, updates: DoneItemUpdate) => {
    const setClauses: string[] = []

    if (updates.content !== undefined) {
      setClauses.push(`content = '${(updates.content || '').replace(/'/g, "''")}'`)
    }
    if (updates.media_urls !== undefined) {
      if (updates.media_urls === null) {
        setClauses.push('media_urls = NULL')
      } else {
        const urlsArray = (updates.media_urls || []).map(u => `"${u}"`).join(',')
        setClauses.push(`media_urls = ARRAY[${urlsArray}]::text[]`)
      }
    }

    if (setClauses.length === 0) return ''

    const query = `
      UPDATE wip.done_items
      SET ${setClauses.join(', ')}
      WHERE id = '${id}'
      RETURNING id, content, media_urls, created_at
    `

    return query
  },

  // Delete item
  delete: (id: string) => {
    return `DELETE FROM wip.done_items WHERE id = '${id}' RETURNING id`
  }
}
