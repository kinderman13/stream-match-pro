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
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      interactions: {
        Row: {
          action: string
          created_at: string
          id: string
          media_type: string
          tmdb_id: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          media_type: string
          tmdb_id: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          media_type?: string
          tmdb_id?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          display_name: string | null
          id: string
          last_seen_at: string | null
          updated_at: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          media_type: string
          poster_path: string | null
          rating: number
          source: string
          title: string | null
          tmdb_id: number
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          poster_path?: string | null
          rating: number
          source?: string
          title?: string | null
          tmdb_id: number
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          poster_path?: string | null
          rating?: number
          source?: string
          title?: string | null
          tmdb_id?: number
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      recommendation_history: {
        Row: {
          created_at: string
          id: string
          media_type: string
          tmdb_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          tmdb_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          tmdb_id?: number
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          category: string
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          onboarding_completed: boolean
          selected_providers: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          onboarding_completed?: boolean
          selected_providers?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          onboarding_completed?: boolean
          selected_providers?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          media_type: string
          poster_path: string | null
          title: string | null
          tmdb_id: number
          user_id: string
          year: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          poster_path?: string | null
          title?: string | null
          tmdb_id: number
          user_id: string
          year?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          poster_path?: string | null
          title?: string | null
          tmdb_id?: number
          user_id?: string
          year?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
