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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      briefings: {
        Row: {
          acknowledged_at: string | null
          content_json: Json | null
          created_at: string
          date: string
          id: string
          intention_text: string | null
          skip_task_ids: string[] | null
          top3_task_ids: string[] | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          content_json?: Json | null
          created_at?: string
          date: string
          id?: string
          intention_text?: string | null
          skip_task_ids?: string[] | null
          top3_task_ids?: string[] | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          content_json?: Json | null
          created_at?: string
          date?: string
          id?: string
          intention_text?: string | null
          skip_task_ids?: string[] | null
          top3_task_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          brief_action: string | null
          calendar_link_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          dismissed: boolean | null
          dtend: string | null
          dtstart: string
          id: string
          location: string | null
          recurrence_rule: string | null
          summary: string | null
          uid: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          brief_action?: string | null
          calendar_link_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dismissed?: boolean | null
          dtend?: string | null
          dtstart: string
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          summary?: string | null
          uid: string
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          brief_action?: string | null
          calendar_link_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dismissed?: boolean | null
          dtend?: string | null
          dtstart?: string
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          summary?: string | null
          uid?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_link_id_fkey"
            columns: ["calendar_link_id"]
            isOneToOne: false
            referencedRelation: "calendar_links"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_links: {
        Row: {
          color: string | null
          created_at: string
          enabled: boolean
          ics_url: string
          id: string
          last_synced_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          enabled?: boolean
          ics_url: string
          id?: string
          last_synced_at?: string | null
          name?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          enabled?: boolean
          ics_url?: string
          id?: string
          last_synced_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      categorization_patterns: {
        Row: {
          confidence: number | null
          context: Database["public"]["Enums"]["task_context"] | null
          created_at: string
          energy_type: Database["public"]["Enums"]["energy_type"] | null
          id: string
          pattern_text: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          context?: Database["public"]["Enums"]["task_context"] | null
          created_at?: string
          energy_type?: Database["public"]["Enums"]["energy_type"] | null
          id?: string
          pattern_text: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          context?: Database["public"]["Enums"]["task_context"] | null
          created_at?: string
          energy_type?: Database["public"]["Enums"]["energy_type"] | null
          id?: string
          pattern_text?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          completed_pomodoros: number | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed_pomodoros?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed_pomodoros?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_briefs: {
        Row: {
          background_summary: string | null
          calendar_event_id: string | null
          created_at: string
          id: string
          participants_json: Json | null
          person_company: string | null
          person_linkedin_url: string | null
          person_name: string | null
          person_role: string | null
          research_json: Json | null
          status: string | null
          talking_points_json: Json | null
          user_id: string
        }
        Insert: {
          background_summary?: string | null
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          participants_json?: Json | null
          person_company?: string | null
          person_linkedin_url?: string | null
          person_name?: string | null
          person_role?: string | null
          research_json?: Json | null
          status?: string | null
          talking_points_json?: Json | null
          user_id: string
        }
        Update: {
          background_summary?: string | null
          calendar_event_id?: string | null
          created_at?: string
          id?: string
          participants_json?: Json | null
          person_company?: string | null
          person_linkedin_url?: string | null
          person_name?: string | null
          person_role?: string | null
          research_json?: Json | null
          status?: string | null
          talking_points_json?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deep_work_preference: string | null
          display_name: string | null
          id: string
          notification_enabled: boolean | null
          onboarding_completed: boolean | null
          pomodoro_duration: number | null
          timezone: string | null
          updated_at: string
          user_id: string
          work_hours_end: string | null
          work_hours_start: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deep_work_preference?: string | null
          display_name?: string | null
          id?: string
          notification_enabled?: boolean | null
          onboarding_completed?: boolean | null
          pomodoro_duration?: number | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          work_hours_end?: string | null
          work_hours_start?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deep_work_preference?: string | null
          display_name?: string | null
          id?: string
          notification_enabled?: boolean | null
          onboarding_completed?: boolean | null
          pomodoro_duration?: number | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          work_hours_end?: string | null
          work_hours_start?: string | null
        }
        Relationships: []
      }
      project_boards: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_suggested: boolean | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          user_id: string
        }
        Insert: {
          ai_suggested?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          user_id: string
        }
        Update: {
          ai_suggested?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          short_code: string | null
          sort_order: number | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          short_code?: string | null
          sort_order?: number | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          short_code?: string | null
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          tag_id: string
          task_id: string
        }
        Insert: {
          tag_id: string
          task_id: string
        }
        Update: {
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_duration_min: number | null
          ai_confidence_score: number | null
          board_id: string | null
          brief_action: string | null
          category_id: string | null
          completed_at: string | null
          context: Database["public"]["Enums"]["task_context"]
          created_at: string
          description: string | null
          due_date: string | null
          energy_type: Database["public"]["Enums"]["energy_type"]
          estimated_duration_min: number | null
          id: string
          location: string | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence_rule: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_duration_min?: number | null
          ai_confidence_score?: number | null
          board_id?: string | null
          brief_action?: string | null
          category_id?: string | null
          completed_at?: string | null
          context?: Database["public"]["Enums"]["task_context"]
          created_at?: string
          description?: string | null
          due_date?: string | null
          energy_type?: Database["public"]["Enums"]["energy_type"]
          estimated_duration_min?: number | null
          id?: string
          location?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_rule?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_duration_min?: number | null
          ai_confidence_score?: number | null
          board_id?: string | null
          brief_action?: string | null
          category_id?: string | null
          completed_at?: string | null
          context?: Database["public"]["Enums"]["task_context"]
          created_at?: string
          description?: string | null
          due_date?: string | null
          energy_type?: Database["public"]["Enums"]["energy_type"]
          estimated_duration_min?: number | null
          id?: string
          location?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_rule?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "project_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          created_at: string
          id: string
          reflections_json: Json | null
          stats_json: Json | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          reflections_json?: Json | null
          stats_json?: Json | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          reflections_json?: Json | null
          stats_json?: Json | null
          user_id?: string
          week_start?: string
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
      energy_type: "deep_work" | "shallow" | "admin" | "quick_win"
      project_status: "active" | "completed" | "archived"
      task_context: "work" | "mba" | "personal" | "finance" | "health" | "legal"
      task_priority: "p1" | "p2" | "p3" | "p4"
      task_status: "todo" | "in_progress" | "done" | "archived"
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
      energy_type: ["deep_work", "shallow", "admin", "quick_win"],
      project_status: ["active", "completed", "archived"],
      task_context: ["work", "mba", "personal", "finance", "health", "legal"],
      task_priority: ["p1", "p2", "p3", "p4"],
      task_status: ["todo", "in_progress", "done", "archived"],
    },
  },
} as const
