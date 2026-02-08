export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: Record<string, never>
  wip: {
    Tables: {
      done_items: {
        Row: DoneItem
        Insert: DoneItemInsert
        Update: DoneItemUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type DatabasePublic = Database

export interface DoneItem {
  id: string
  content: string | null
  media_urls: string[] | null
  created_at: string
}

export type DoneItemInsert = {
  id?: string
  content?: string | null
  media_urls?: string[] | null
  created_at?: string
}

export type DoneItemUpdate = {
  id?: string
  content?: string | null
  media_urls?: string[] | null
  created_at?: string
}

export interface DoneItemWithDisplay extends DoneItem {
  // Display-only green tick (not stored in DB)
  displayTick?: boolean
}
