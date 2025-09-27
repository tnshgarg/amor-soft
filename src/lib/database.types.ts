export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      songs: {
        Row: {
          id: string
          user_id: string
          title: string
          prompt: string
          style_tags: string[]
          lyrics: string
          audio_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          prompt: string
          style_tags: string[]
          lyrics: string
          audio_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          prompt?: string
          style_tags?: string[]
          lyrics?: string
          audio_url?: string | null
          created_at?: string
        }
      }
      lyrics_index: {
        Row: {
          id: number
          song_name: string
          lyrics_text: string
          embedding: number[]
        }
        Insert: {
          id?: number
          song_name: string
          lyrics_text: string
          embedding: number[]
        }
        Update: {
          id?: number
          song_name?: string
          lyrics_text?: string
          embedding?: number[]
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_lyrics: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: number
          song_name: string
          lyrics_text: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
