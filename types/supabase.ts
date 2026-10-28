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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          id: string
          is_read: boolean
          order_id: string | null
          sent_at: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          id?: string
          is_read?: boolean
          order_id?: string | null
          sent_at?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          id?: string
          is_read?: boolean
          order_id?: string | null
          sent_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          assigned_admin_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          file_id: string
          id: string
          midtrans_order_id: string | null
          midtrans_snap_token: string | null
          order_number: string
          paid_at: string | null
          payment_method: string | null
          price_idr: number
          processed_at: string | null
          report_storage_path: string | null
          report_uploaded_at: string | null
          service_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          used_quota_id: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          file_id: string
          id?: string
          midtrans_order_id?: string | null
          midtrans_snap_token?: string | null
          order_number: string
          paid_at?: string | null
          payment_method?: string | null
          price_idr?: number
          processed_at?: string | null
          report_storage_path?: string | null
          report_uploaded_at?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          used_quota_id?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          file_id?: string
          id?: string
          midtrans_order_id?: string | null
          midtrans_snap_token?: string | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string | null
          price_idr?: number
          processed_at?: string | null
          report_storage_path?: string | null
          report_uploaded_at?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          used_quota_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_used_quota_id_fkey"
            columns: ["used_quota_id"]
            isOneToOne: false
            referencedRelation: "user_quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          credit_balance: number
          full_name: string | null
          id: string
          is_active: boolean
          referral_code: string
          referred_by: string | null
          role: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          credit_balance?: number
          full_name?: string | null
          id: string
          is_active?: boolean
          referral_code: string
          referred_by?: string | null
          role?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          credit_balance?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          referral_code?: string
          referred_by?: string | null
          role?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quota_packages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price_idr: number
          quota_amount: number
          service_id: string
          updated_at: string
          validity_days: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price_idr: number
          quota_amount: number
          service_id: string
          updated_at?: string
          validity_days: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price_idr?: number
          quota_amount?: number
          service_id?: string
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "quota_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_idr: number
          created_at: string
          credited_at: string | null
          id: string
          is_credited: boolean
          order_id: string | null
          referred_id: string
          referrer_id: string
        }
        Insert: {
          commission_idr?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          is_credited?: boolean
          order_id?: string | null
          referred_id: string
          referrer_id: string
        }
        Update: {
          commission_idr?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          is_credited?: boolean
          order_id?: string | null
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allowed_formats: string[]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_file_size_mb: number
          name: string
          price_idr: number
          sla_hours: number
          slug: string
          updated_at: string
        }
        Insert: {
          allowed_formats?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_file_size_mb?: number
          name: string
          price_idr: number
          sla_hours?: number
          slug: string
          updated_at?: string
        }
        Update: {
          allowed_formats?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_file_size_mb?: number
          name?: string
          price_idr?: number
          sla_hours?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_idr: number
          created_at: string
          gateway_ref: string | null
          id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount_idr: number
          created_at?: string
          gateway_ref?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount_idr?: number
          created_at?: string
          gateway_ref?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          file_size_bytes: number
          id: string
          is_deleted: boolean
          mime_type: string
          original_name: string
          page_count: number | null
          storage_path: string
          uploaded_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          file_size_bytes: number
          id?: string
          is_deleted?: boolean
          mime_type: string
          original_name: string
          page_count?: number | null
          storage_path: string
          uploaded_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          file_size_bytes?: number
          id?: string
          is_deleted?: boolean
          mime_type?: string
          original_name?: string
          page_count?: number | null
          storage_path?: string
          uploaded_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quotas: {
        Row: {
          expires_at: string
          id: string
          is_expired: boolean
          package_id: string
          purchased_at: string
          quota_remaining: number
          quota_total: number
          service_id: string
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          is_expired?: boolean
          package_id: string
          purchased_at?: string
          quota_remaining: number
          quota_total: number
          service_id: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          is_expired?: boolean
          package_id?: string
          purchased_at?: string
          quota_remaining?: number
          quota_total?: number
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quotas_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quota_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quotas_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quotas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      notification_channel: "in_app" | "whatsapp" | "email"
      order_status:
        | "menunggu_pembayaran"
        | "dibayar"
        | "diproses"
        | "selesai"
        | "dibatalkan"
      transaction_type:
        | "order_payment"
        | "package_purchase"
        | "referral_credit"
        | "credit_redemption"
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
      notification_channel: ["in_app", "whatsapp", "email"],
      order_status: [
        "menunggu_pembayaran",
        "dibayar",
        "diproses",
        "selesai",
        "dibatalkan",
      ],
      transaction_type: [
        "order_payment",
        "package_purchase",
        "referral_credit",
        "credit_redemption",
      ],
    },
  },
} as const
