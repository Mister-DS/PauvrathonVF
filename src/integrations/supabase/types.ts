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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      game_sessions: {
        Row: {
          attempts: number | null
          completed_at: string | null
          game_data: Json | null
          id: string
          max_attempts: number | null
          minigame_name: string
          player_twitch_username: string | null
          started_at: string
          status: string | null
          streamer_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          game_data?: Json | null
          id?: string
          max_attempts?: number | null
          minigame_name: string
          player_twitch_username?: string | null
          started_at?: string
          status?: string | null
          streamer_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          game_data?: Json | null
          id?: string
          max_attempts?: number | null
          minigame_name?: string
          player_twitch_username?: string | null
          started_at?: string
          status?: string | null
          streamer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      minigames: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          twitch_display_name: string | null
          twitch_id: string | null
          twitch_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          twitch_display_name?: string | null
          twitch_id?: string | null
          twitch_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          twitch_display_name?: string | null
          twitch_id?: string | null
          twitch_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streamer_requests: {
        Row: {
          created_at: string
          id: string
          motivation: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          stream_link: string
          twitch_username: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivation: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          stream_link: string
          twitch_username: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivation?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          stream_link?: string
          twitch_username?: string
          user_id?: string
        }
        Relationships: []
      }
      streamers: {
        Row: {
          active_minigames: string[] | null
          clicks_required: number | null
          cooldown_seconds: number | null
          created_at: string
          current_clicks: number | null
          id: string
          is_live: boolean | null
          max_random_time: number | null
          stream_title: string | null
          time_increment: number | null
          time_mode: string | null
          total_time_added: number | null
          twitch_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_minigames?: string[] | null
          clicks_required?: number | null
          cooldown_seconds?: number | null
          created_at?: string
          current_clicks?: number | null
          id?: string
          is_live?: boolean | null
          max_random_time?: number | null
          stream_title?: string | null
          time_increment?: number | null
          time_mode?: string | null
          total_time_added?: number | null
          twitch_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_minigames?: string[] | null
          clicks_required?: number | null
          cooldown_seconds?: number | null
          created_at?: string
          current_clicks?: number | null
          id?: string
          is_live?: boolean | null
          max_random_time?: number | null
          stream_title?: string | null
          time_increment?: number | null
          time_mode?: string | null
          total_time_added?: number | null
          twitch_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streamers_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subathon_stats: {
        Row: {
          clicks_contributed: number | null
          created_at: string
          games_played: number | null
          games_won: number | null
          id: string
          last_activity: string | null
          player_twitch_username: string | null
          streamer_id: string
          time_contributed: number | null
        }
        Insert: {
          clicks_contributed?: number | null
          created_at?: string
          games_played?: number | null
          games_won?: number | null
          id?: string
          last_activity?: string | null
          player_twitch_username?: string | null
          streamer_id: string
          time_contributed?: number | null
        }
        Update: {
          clicks_contributed?: number | null
          created_at?: string
          games_played?: number | null
          games_won?: number | null
          id?: string
          last_activity?: string | null
          player_twitch_username?: string | null
          streamer_id?: string
          time_contributed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subathon_stats_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_user_id: string
          id: string
          streamer_id: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          id?: string
          streamer_id: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          id?: string
          streamer_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_admin_streamer_profile: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_discovery_streamers: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_minigames: string[]
          avatar_url: string
          clicks_required: number
          current_clicks: number
          id: string
          stream_title: string
          time_increment: number
          twitch_display_name: string
          twitch_username: string
        }[]
      }
      get_minigame_code: {
        Args: { minigame_id: string }
        Returns: {
          code: string
          description: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
      get_safe_minigames: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
      get_safe_minigames_public: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
    }
    Enums: {
      user_role: "viewer" | "streamer" | "admin"
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
      user_role: ["viewer", "streamer", "admin"],
    },
  },
} as const
