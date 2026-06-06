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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      card_state: {
        Row: {
          card_id: string
          difficulty: number
          due_date: string
          id: string
          review_count: number
          stability: number
          state: string
          user_id: string
        }
        Insert: {
          card_id: string
          difficulty?: number
          due_date?: string
          id?: string
          review_count?: number
          stability?: number
          state?: string
          user_id: string
        }
        Update: {
          card_id?: string
          difficulty?: number
          due_date?: string
          id?: string
          review_count?: number
          stability?: number
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_state_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          best_move: string | null
          classification: string
          correct_move: string
          cpl: number | null
          created_at: string
          fen: string
          game_id: string | null
          id: string
          note: string | null
          theme: string | null
        }
        Insert: {
          best_move?: string | null
          classification: string
          correct_move: string
          cpl?: number | null
          created_at?: string
          fen: string
          game_id?: string | null
          id?: string
          note?: string | null
          theme?: string | null
        }
        Update: {
          best_move?: string | null
          classification?: string
          correct_move?: string
          cpl?: number | null
          created_at?: string
          fen?: string
          game_id?: string | null
          id?: string
          note?: string | null
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      chess_com_archives: {
        Row: {
          etag: string | null
          fetched_at: string
          id: string
          last_modified: string | null
          month: number
          user_id: string
          year: number
        }
        Insert: {
          etag?: string | null
          fetched_at?: string
          id?: string
          last_modified?: string | null
          month: number
          user_id: string
          year: number
        }
        Update: {
          etag?: string | null
          fetched_at?: string
          id?: string
          last_modified?: string | null
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "chess_com_archives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          black: string | null
          eco: string | null
          id: string
          pgn: string
          played_at: string
          processed_at: string | null
          result: string | null
          source: string
          url: string | null
          user_id: string
          white: string | null
        }
        Insert: {
          black?: string | null
          eco?: string | null
          id?: string
          pgn: string
          played_at: string
          processed_at?: string | null
          result?: string | null
          source?: string
          url?: string | null
          user_id: string
          white?: string | null
        }
        Update: {
          black?: string | null
          eco?: string | null
          id?: string
          pgn?: string
          played_at?: string
          processed_at?: string | null
          result?: string | null
          source?: string
          url?: string | null
          user_id?: string
          white?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_log: {
        Row: {
          card_id: string
          id: string
          rating: string
          reviewed_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          id?: string
          rating: string
          reviewed_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          id?: string
          rating?: string
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          cards_created: number
          completed_at: string | null
          error: string | null
          games_processed: number
          games_total: number
          id: string
          mode: string
          stage: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          cards_created?: number
          completed_at?: string | null
          error?: string | null
          games_processed?: number
          games_total?: number
          id?: string
          mode: string
          stage?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          cards_created?: number
          completed_at?: string | null
          error?: string | null
          games_processed?: number
          games_total?: number
          id?: string
          mode?: string
          stage?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_step_log: {
        Row: {
          created_at: string
          details: Json | null
          duration_ms: number | null
          error: string | null
          error_code: string | null
          game_index: number | null
          game_url: string | null
          id: string
          status: string
          step: string
          sync_log_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error?: string | null
          error_code?: string | null
          game_index?: number | null
          game_url?: string | null
          id?: string
          status: string
          step: string
          sync_log_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error?: string | null
          error_code?: string | null
          game_index?: number | null
          game_url?: string | null
          id?: string
          status?: string
          step?: string
          sync_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_step_log_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "sync_log"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          chess_com_username: string | null
          created_at: string
          daily_new_limit: number
          email: string
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          chess_com_username?: string | null
          created_at?: string
          daily_new_limit?: number
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
        }
        Update: {
          chess_com_username?: string | null
          created_at?: string
          daily_new_limit?: number
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
