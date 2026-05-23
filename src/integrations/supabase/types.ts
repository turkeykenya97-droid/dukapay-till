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
      products: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          reorder_level: number
          shop_id: string
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price: number
          reorder_level?: number
          shop_id: string
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          reorder_level?: number
          shop_id?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_paid: number
          created_at: string
          customer_phone: string
          id: string
          mpesa_amount: number | null
          payhero_checkout_request_id: string | null
          payhero_reference: string | null
          payment_status: string
          shop_id: string
          sold_at: string
          total_amount: number
        }
        Insert: {
          cash_paid?: number
          created_at?: string
          customer_phone: string
          id?: string
          mpesa_amount?: number | null
          payhero_checkout_request_id?: string | null
          payhero_reference?: string | null
          payment_status?: string
          shop_id: string
          sold_at?: string
          total_amount: number
        }
        Update: {
          cash_paid?: number
          created_at?: string
          customer_phone?: string
          id?: string
          mpesa_amount?: number | null
          payhero_checkout_request_id?: string | null
          payhero_reference?: string | null
          payment_status?: string
          shop_id?: string
          sold_at?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          created_at: string
          id: string
          owner_name: string
          password_hash: string
          payhero_channel_id: number | null
          phone: string
          pin_hash: string
          pin_valid_until: string | null
          shop_name: string
          subscription_expiry: string
          subscription_status: string
          till_number: string | null
          till_type: string | null
          trial_start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_name: string
          password_hash: string
          payhero_channel_id?: number | null
          phone: string
          pin_hash: string
          pin_valid_until?: string | null
          shop_name: string
          subscription_expiry: string
          subscription_status?: string
          till_number?: string | null
          till_type?: string | null
          trial_start?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_name?: string
          password_hash?: string
          payhero_channel_id?: number | null
          phone?: string
          pin_hash?: string
          pin_valid_until?: string | null
          shop_name?: string
          subscription_expiry?: string
          subscription_status?: string
          till_number?: string | null
          till_type?: string | null
          trial_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          id: string
          paid_at: string
          payhero_reference: string | null
          payment_status: string
          shop_id: string
        }
        Insert: {
          amount: number
          id?: string
          paid_at?: string
          payhero_reference?: string | null
          payment_status?: string
          shop_id: string
        }
        Update: {
          amount?: number
          id?: string
          paid_at?: string
          payhero_reference?: string | null
          payment_status?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: number
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
