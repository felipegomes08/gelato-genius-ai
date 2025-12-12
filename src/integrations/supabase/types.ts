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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          coupon_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          customer_id: string
          discount_type: string
          discount_value: number
          expire_at: string
          id: string
          is_active: boolean
          is_used: boolean
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_type: string
          discount_value: number
          expire_at: string
          id?: string
          is_active?: boolean
          is_used?: boolean
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_type?: string
          discount_value?: number
          expire_at?: string
          id?: string
          is_active?: boolean
          is_used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          installment_current: number | null
          installment_total: number | null
          is_paid: boolean | null
          notes: string | null
          parent_transaction_id: string | null
          payment_method: string | null
          payment_source: string | null
          receipt_url: string | null
          recurrence_type: string | null
          reference_id: string | null
          reimbursed_at: string | null
          reimbursement_status: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          is_paid?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          payment_source?: string | null
          receipt_url?: string | null
          recurrence_type?: string | null
          reference_id?: string | null
          reimbursed_at?: string | null
          reimbursement_status?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          is_paid?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          payment_source?: string | null
          receipt_url?: string | null
          recurrence_type?: string | null
          reference_id?: string | null
          reimbursed_at?: string | null
          reimbursement_status?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          is_recurring: boolean
          is_sent: boolean
          last_sent_at: string | null
          message: string
          recurrence_day_of_month: number | null
          recurrence_day_of_week: number | null
          recurrence_end_date: string | null
          recurrence_time: string | null
          recurrence_type: string | null
          scheduled_at: string | null
          sent_at: string | null
          target_type: string
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          is_sent?: boolean
          last_sent_at?: string | null
          message: string
          recurrence_day_of_month?: number | null
          recurrence_day_of_week?: number | null
          recurrence_end_date?: string | null
          recurrence_time?: string | null
          recurrence_type?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          target_type?: string
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          is_sent?: boolean
          last_sent_at?: string | null
          message?: string
          recurrence_day_of_month?: number | null
          recurrence_day_of_week?: number | null
          recurrence_end_date?: string | null
          recurrence_time?: string | null
          recurrence_type?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          category_id: string | null
          controls_stock: boolean
          created_at: string
          created_by: string | null
          current_stock: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number | null
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          category: string
          category_id?: string | null
          controls_stock?: boolean
          created_at?: string
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          category_id?: string | null
          controls_stock?: boolean
          created_at?: string
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
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
          coupon_id: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          discount_amount: number
          id: string
          notes: string | null
          payment_method: string
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_method: string
          status?: string
          subtotal: number
          total: number
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_by: string
          completion_date: string
          id: string
          notes: string | null
          task_id: string
        }
        Insert: {
          completed_at?: string
          completed_by: string
          completion_date: string
          id?: string
          notes?: string | null
          task_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          completion_date?: string
          id?: string
          notes?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_active: boolean
          is_recurring: boolean
          recurrence_day_of_month: number | null
          recurrence_day_of_week: number | null
          recurrence_end_date: string | null
          recurrence_start_date: string | null
          recurrence_type: string | null
          recurrence_week_parity: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          recurrence_day_of_month?: number | null
          recurrence_day_of_week?: number | null
          recurrence_end_date?: string | null
          recurrence_start_date?: string | null
          recurrence_type?: string | null
          recurrence_week_parity?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          recurrence_day_of_month?: number | null
          recurrence_day_of_week?: number | null
          recurrence_end_date?: string | null
          recurrence_start_date?: string | null
          recurrence_type?: string | null
          recurrence_week_parity?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_access_financial: boolean
          can_access_notifications: boolean
          can_access_products: boolean
          can_access_reports: boolean
          can_access_sales: boolean
          can_access_settings: boolean
          can_access_stock: boolean
          can_access_tasks: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_financial?: boolean
          can_access_notifications?: boolean
          can_access_products?: boolean
          can_access_reports?: boolean
          can_access_sales?: boolean
          can_access_settings?: boolean
          can_access_stock?: boolean
          can_access_tasks?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_financial?: boolean
          can_access_notifications?: boolean
          can_access_products?: boolean
          can_access_reports?: boolean
          can_access_sales?: boolean
          can_access_settings?: boolean
          can_access_stock?: boolean
          can_access_tasks?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_financial_area: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_access_notifications_area: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_access_products_area: { Args: { _user_id: string }; Returns: boolean }
      can_access_sales_area: { Args: { _user_id: string }; Returns: boolean }
      can_access_settings_area: { Args: { _user_id: string }; Returns: boolean }
      can_access_stock_area: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master" | "employee"
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
      app_role: ["master", "employee"],
    },
  },
} as const
