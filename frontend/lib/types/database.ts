export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string
          slug: string
          name: string
          short_tag: string
          description: string | null
          target_audience: string | null
          real_requirements: string | null
          difficulty: number | null
          time_intensity: number | null
          attendance_type: string | null
          credits: number | null
          semester: 'zimní' | 'letní' | 'oba' | null
          faculty: string | null
          department: string | null
          year: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>
      }
      subject_tags: {
        Row: {
          id: string
          subject_id: string
          tag: string
        }
        Insert: Omit<Database['public']['Tables']['subject_tags']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['subject_tags']['Insert']>
      }
      flashcard_decks: {
        Row: {
          id: string
          subject_id: string | null
          creator_id: string
          title: string
          description: string | null
          is_public: boolean
          card_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['flashcard_decks']['Row'], 'id' | 'card_count' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['flashcard_decks']['Insert']>
      }
      flashcards: {
        Row: {
          id: string
          deck_id: string
          front: string
          back: string
          position: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['flashcards']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['flashcards']['Insert']>
      }
      card_progress: {
        Row: {
          id: string
          user_id: string
          card_id: string
          ease_factor: number
          interval_days: number
          repetitions: number
          due_date: string
          status: 'new' | 'learning' | 'review'
          last_reviewed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['card_progress']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['card_progress']['Insert']>
      }
      subject_ratings: {
        Row: {
          id: string
          subject_id: string
          user_id: string
          difficulty: number | null
          usefulness: number | null
          workload: number | null
          overall: number
          comment: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['subject_ratings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['subject_ratings']['Insert']>
      }
      subject_rating_stats: {
        Row: {
          subject_id: string
          avg_overall: number
          avg_difficulty: number
          avg_usefulness: number
          avg_workload: number
          total_ratings: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subject_rating_stats']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['subject_rating_stats']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Subject = Database['public']['Tables']['subjects']['Row']
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
export type SubjectTag = Database['public']['Tables']['subject_tags']['Row']
export type FlashcardDeck = Database['public']['Tables']['flashcard_decks']['Row']
export type Flashcard = Database['public']['Tables']['flashcards']['Row']
export type CardProgress = Database['public']['Tables']['card_progress']['Row']
export type SubjectRating = Database['public']['Tables']['subject_ratings']['Row']
export type SubjectRatingStats = Database['public']['Tables']['subject_rating_stats']['Row']

// Extended types with joins
export type SubjectWithStats = Subject & {
  rating_stats?: SubjectRatingStats | null
  tags?: SubjectTag[]
}
