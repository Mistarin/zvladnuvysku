export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity_acknowledgements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          state_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          state_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          state_token?: string
          user_id?: string
        }
        Relationships: []
      }
      card_progress: {
        Row: {
          card_id: string
          due_date: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          repetitions: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          due_date?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          repetitions?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          due_date?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          repetitions?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_progress_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          faculty: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          faculty: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          faculty?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          source_id: string | null
          source_label: string | null
          source_type: string | null
          status: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          source_id?: string | null
          source_label?: string | null
          source_type?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          card_count: number
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_public: boolean
          share_slug: string
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          card_count?: number
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean
          share_slug: string
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          card_count?: number
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean
          share_slug?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer_data: Json
          back: string
          created_at: string
          deck_id: string
          front: string
          id: string
          media_path: string | null
          position: number
          prompt: string
          question_type: string
        }
        Insert: {
          answer_data?: Json
          back: string
          created_at?: string
          deck_id: string
          front: string
          id?: string
          media_path?: string | null
          position?: number
          prompt?: string
          question_type?: string
        }
        Update: {
          answer_data?: Json
          back?: string
          created_at?: string
          deck_id?: string
          front?: string
          id?: string
          media_path?: string | null
          position?: number
          prompt?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      material_groups: {
        Row: {
          created_at: string
          id: string
          share_slug: string
          subject_id: string | null
          title: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_slug: string
          subject_id?: string | null
          title: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          id?: string
          share_slug?: string
          subject_id?: string | null
          title?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_groups_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_groups_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          faculty: string | null
          legal_accepted_at: string | null
          legal_accepted_version: string | null
          secondary_faculty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          faculty?: string | null
          legal_accepted_at?: string | null
          legal_accepted_version?: string | null
          secondary_faculty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          faculty?: string | null
          legal_accepted_at?: string | null
          legal_accepted_version?: string | null
          secondary_faculty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_subject_reviews: {
        Row: {
          author_user_id: string | null
          comment: string
          created_at: string
          id: string
          is_anonymous: boolean
          overall: number
          subject_id: string
        }
        Insert: {
          author_user_id?: string | null
          comment: string
          created_at: string
          id: string
          is_anonymous?: boolean
          overall: number
          subject_id: string
        }
        Update: {
          author_user_id?: string | null
          comment?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          overall?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_subject_reviews_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "subject_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_subject_reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_subject_reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      public_teacher_reviews: {
        Row: {
          author_user_id: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          rating: number
          review: string
          teacher_id: string
        }
        Insert: {
          author_user_id?: string | null
          created_at: string
          id: string
          is_anonymous?: boolean
          rating: number
          review: string
          teacher_id: string
        }
        Update: {
          author_user_id?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          rating?: number
          review?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_teacher_reviews_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "teacher_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_teacher_reviews_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_materials: {
        Row: {
          created_at: string
          file_path: string
          group_id: string | null
          id: string
          is_approved: boolean
          moderated_at: string | null
          moderation_status: string
          page_count: number | null
          points_override: number | null
          rejection_reason: string | null
          share_slug: string
          size_bytes: number
          subject_id: string
          title: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          group_id?: string | null
          id?: string
          is_approved?: boolean
          moderated_at?: string | null
          moderation_status?: string
          page_count?: number | null
          points_override?: number | null
          rejection_reason?: string | null
          share_slug: string
          size_bytes: number
          subject_id: string
          title: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          group_id?: string | null
          id?: string
          is_approved?: boolean
          moderated_at?: string | null
          moderation_status?: string
          page_count?: number | null
          points_override?: number | null
          rejection_reason?: string | null
          share_slug?: string
          size_bytes?: number
          subject_id?: string
          title?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_materials_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "material_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_proposals: {
        Row: {
          created_at: string
          data: Json
          id: string
          note: string | null
          proposed_by: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subject_id: string | null
          submission_token: string | null
          type: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          note?: string | null
          proposed_by: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id?: string | null
          submission_token?: string | null
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          note?: string | null
          proposed_by?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subject_id?: string | null
          submission_token?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_proposals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_proposals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_rating_stats: {
        Row: {
          avg_difficulty: number | null
          avg_overall: number | null
          avg_usefulness: number | null
          avg_workload: number | null
          subject_id: string
          total_ratings: number | null
          updated_at: string | null
        }
        Insert: {
          avg_difficulty?: number | null
          avg_overall?: number | null
          avg_usefulness?: number | null
          avg_workload?: number | null
          subject_id: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_difficulty?: number | null
          avg_overall?: number | null
          avg_usefulness?: number | null
          avg_workload?: number | null
          subject_id?: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_rating_stats_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_rating_stats_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_ratings: {
        Row: {
          comment: string | null
          comment_is_approved: boolean | null
          created_at: string | null
          difficulty: number | null
          id: string
          is_anonymous: boolean
          overall: number
          overall_rating: number | null
          subject_id: string
          usefulness: number | null
          user_id: string
          workload: number | null
        }
        Insert: {
          comment?: string | null
          comment_is_approved?: boolean | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          is_anonymous?: boolean
          overall: number
          overall_rating?: number | null
          subject_id: string
          usefulness?: number | null
          user_id: string
          workload?: number | null
        }
        Update: {
          comment?: string | null
          comment_is_approved?: boolean | null
          created_at?: string | null
          difficulty?: number | null
          id?: string
          is_anonymous?: boolean
          overall?: number
          overall_rating?: number | null
          subject_id?: string
          usefulness?: number | null
          user_id?: string
          workload?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_ratings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_ratings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_tags: {
        Row: {
          id: string
          subject_id: string
          tag: string
        }
        Insert: {
          id?: string
          subject_id: string
          tag: string
        }
        Update: {
          id?: string
          subject_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_tags_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_tags_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_teachers: {
        Row: {
          subject_id: string
          teacher_id: string
        }
        Insert: {
          subject_id: string
          teacher_id: string
        }
        Update: {
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subject_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          attendance_type: string | null
          created_at: string | null
          credits: number | null
          department: string | null
          department_id: string | null
          description: string | null
          difficulty: number | null
          exam_from_home: boolean | null
          faculty: string | null
          id: string
          name: string
          real_requirements: string | null
          semester: string | null
          short_tag: string
          slug: string
          target_audience: string | null
          time_intensity: number | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          attendance_type?: string | null
          created_at?: string | null
          credits?: number | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          difficulty?: number | null
          exam_from_home?: boolean | null
          faculty?: string | null
          id?: string
          name: string
          real_requirements?: string | null
          semester?: string | null
          short_tag: string
          slug: string
          target_audience?: string | null
          time_intensity?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          attendance_type?: string | null
          created_at?: string | null
          credits?: number | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          difficulty?: number | null
          exam_from_home?: boolean | null
          faculty?: string | null
          id?: string
          name?: string
          real_requirements?: string | null
          semester?: string | null
          short_tag?: string
          slug?: string
          target_audience?: string | null
          time_intensity?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_rating_stats: {
        Row: {
          avg_rating: number | null
          teacher_id: string
          total_ratings: number | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          teacher_id: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          teacher_id?: string
          total_ratings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_rating_stats_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_ratings: {
        Row: {
          comment_is_approved: boolean | null
          created_at: string | null
          id: string
          is_anonymous: boolean
          rating: number | null
          review: string | null
          teacher_id: string | null
          user_id: string | null
        }
        Insert: {
          comment_is_approved?: boolean | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean
          rating?: number | null
          review?: string | null
          teacher_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment_is_approved?: boolean | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean
          rating?: number | null
          review?: string | null
          teacher_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_ratings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          department: string | null
          department_id: string | null
          faculty: string
          id: string
          is_approved: boolean
          name: string
          proposed_by: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          department_id?: string | null
          faculty: string
          id?: string
          is_approved?: boolean
          name: string
          proposed_by?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          department?: string | null
          department_id?: string | null
          faculty?: string
          id?: string
          is_approved?: boolean
          name?: string
          proposed_by?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      subject_search_view: {
        Row: {
          attendance_type: string | null
          avg_subject_rating: number | null
          avg_teacher_rating: number | null
          created_at: string | null
          credits: number | null
          department: string | null
          description: string | null
          difficulty: number | null
          exam_from_home: boolean | null
          faculty: string | null
          id: string | null
          name: string | null
          real_requirements: string | null
          semester: string | null
          short_tag: string | null
          slug: string | null
          target_audience: string | null
          time_intensity: number | null
          updated_at: string | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_unique_share_slug: {
        Args: { requested_slug: string; row_id: string; table_name: string }
        Returns: string
      }
      generate_department_slug: {
        Args: { department_faculty: string; department_name: string }
        Returns: string
      }
      get_hall_of_fame: {
        Args: { entry_limit?: number; period_key?: string }
        Returns: {
          display_name: string
          faculty: string
          flashcard_count: number
          material_count: number
          secondary_faculty: string
          subject_count: number
          teacher_count: number
          total_score: number
          user_id: string
        }[]
      }
      get_public_profile_stats: {
        Args: { profile_user_id: string }
        Returns: {
          anon_subject_comment_count: number
          anon_teacher_review_count: number
          approved_score: number
          faculty: string
          flashcard_count: number
          level: number
          level_progress_xp: number
          material_count: number
          next_level_xp: number
          public_subject_comment_count: number
          public_teacher_review_count: number
          secondary_faculty: string
          subject_comment_count: number
          subject_count: number
          teacher_count: number
          teacher_review_count: number
          total_xp: number
        }[]
      }
      get_public_profile_subject_proposals: {
        Args: { entry_limit?: number; profile_user_id: string }
        Returns: {
          created_at: string
          proposal_id: string
          proposal_type: string
          subject_name: string
          subject_short_tag: string
          subject_slug: string
        }[]
      }
      get_public_profile_summaries: {
        Args: { profile_user_ids: string[] }
        Returns: {
          display_name: string
          faculty: string
          level: number
          secondary_faculty: string
          total_xp: number
          user_id: string
        }[]
      }
      normalize_department_name_sql: {
        Args: { value: string }
        Returns: string
      }
      record_card_review: {
        Args: { p_card_id: string; p_quality: number }
        Returns: Json
      }
      slugify_share_text: {
        Args: { fallback_prefix: string; source: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Convenience types
export type Subject = Database['public']['Tables']['subjects']['Row']
export type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
export type Department = Database['public']['Tables']['departments']['Row']
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert']
export type SubjectTag = Database['public']['Tables']['subject_tags']['Row']
export type FlashcardDeck = Database['public']['Tables']['flashcard_decks']['Row']
export type Flashcard = Database['public']['Tables']['flashcards']['Row']
export type CardProgress = Database['public']['Tables']['card_progress']['Row']
export type SubjectRating = Database['public']['Tables']['subject_ratings']['Row']
export type SubjectRatingStats = Database['public']['Tables']['subject_rating_stats']['Row']
export type Teacher = Database['public']['Tables']['teachers']['Row']
export type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
export type TeacherRating = Database['public']['Tables']['teacher_ratings']['Row']
export type SubjectTeacher = Database['public']['Tables']['subject_teachers']['Row']
export type SubjectMaterial = Database['public']['Tables']['subject_materials']['Row']
export type MaterialGroup = Database['public']['Tables']['material_groups']['Row']
export type SubjectProposalRecord = Database['public']['Tables']['subject_proposals']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type ActivityAcknowledgement = Database['public']['Tables']['activity_acknowledgements']['Row']
export type TeacherRatingStats = Database['public']['Tables']['teacher_rating_stats']['Row']
export type SubjectSearchView = Database['public']['Views']['subject_search_view']['Row']

export type HallOfFameRow = Database['public']['Functions']['get_hall_of_fame']['Returns'][number]
export type HallOfFamePeriod = 'week' | 'month' | 'all'

// Extended types with joins
export type SubjectWithStats = SubjectSearchView & {
  rating_stats?: SubjectRatingStats | null
  tags?: SubjectTag[]
  teachers?: Teacher[]
  teacher_rating_preview?: Array<{
    id: string
    slug: string
    name: string
    avg_rating: number | null
    total_ratings: number
  }>
}
