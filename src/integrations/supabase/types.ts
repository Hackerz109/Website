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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          unit_price_cents: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku?: string | null
          unit_price_cents: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          unit_price_cents?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string | null
          discount_cents: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          shipping_address: Json | null
          shipping_cents: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string | null
          discount_cents?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          max_discount_cents: number | null
          visibility: Database["public"]["Enums"]["coupon_visibility"]
          active: boolean
          min_order_cents: number | null
          max_order_cents: number | null
          first_order_only: boolean
          login_required: boolean
          customer_type: Database["public"]["Enums"]["coupon_customer_type"]
          eligible_product_ids: string[]
          eligible_category_ids: string[]
          eligible_brand_ids: string[]
          excluded_product_ids: string[]
          excluded_category_ids: string[]
          excluded_brand_ids: string[]
          stackable: boolean
          valid_from: string | null
          valid_until: string | null
          usage_limit: number | null
          usage_limit_per_customer: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value?: number
          max_discount_cents?: number | null
          visibility?: Database["public"]["Enums"]["coupon_visibility"]
          active?: boolean
          min_order_cents?: number | null
          max_order_cents?: number | null
          first_order_only?: boolean
          login_required?: boolean
          customer_type?: Database["public"]["Enums"]["coupon_customer_type"]
          eligible_product_ids?: string[]
          eligible_category_ids?: string[]
          eligible_brand_ids?: string[]
          excluded_product_ids?: string[]
          excluded_category_ids?: string[]
          excluded_brand_ids?: string[]
          stackable?: boolean
          valid_from?: string | null
          valid_until?: string | null
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value?: number
          max_discount_cents?: number | null
          visibility?: Database["public"]["Enums"]["coupon_visibility"]
          active?: boolean
          min_order_cents?: number | null
          max_order_cents?: number | null
          first_order_only?: boolean
          login_required?: boolean
          customer_type?: Database["public"]["Enums"]["coupon_customer_type"]
          eligible_product_ids?: string[]
          eligible_category_ids?: string[]
          eligible_brand_ids?: string[]
          excluded_product_ids?: string[]
          excluded_category_ids?: string[]
          excluded_brand_ids?: string[]
          stackable?: boolean
          valid_from?: string | null
          valid_until?: string | null
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          id: string
          coupon_id: string
          order_id: string
          user_id: string | null
          discount_cents: number
          order_total_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          coupon_id: string
          order_id: string
          user_id?: string | null
          discount_cents?: number
          order_total_cents?: number
          created_at?: string
        }
        Update: {
          id?: string
          coupon_id?: string
          order_id?: string
          user_id?: string | null
          discount_cents?: number
          order_total_cents?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          name: string
          price_cents: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_cents: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_cents?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          brand_id: string | null
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          mrp_cents: number | null
          name: string
          price_cents: number
          specifications: Json
          sku: string | null
          slug: string
          stock: number
          updated_at: string
          warranty: string | null
          warranty_available: boolean
          warranty_type: Database["public"]["Enums"]["warranty_type"] | null
          warranty_duration: string | null
          warranty_provider: string | null
          warranty_service_method: Database["public"]["Enums"]["warranty_service_method"] | null
          warranty_notes: string | null
        }
        Insert: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          mrp_cents?: number | null
          name: string
          price_cents: number
          specifications?: Json
          sku?: string | null
          slug: string
          stock?: number
          updated_at?: string
          warranty?: string | null
          warranty_available?: boolean
          warranty_type?: Database["public"]["Enums"]["warranty_type"] | null
          warranty_duration?: string | null
          warranty_provider?: string | null
          warranty_service_method?: Database["public"]["Enums"]["warranty_service_method"] | null
          warranty_notes?: string | null
        }
        Update: {
          active?: boolean
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          mrp_cents?: number | null
          name?: string
          price_cents?: number
          specifications?: Json
          sku?: string | null
          slug?: string
          stock?: number
          updated_at?: string
          warranty?: string | null
          warranty_available?: boolean
          warranty_type?: Database["public"]["Enums"]["warranty_type"] | null
          warranty_duration?: string | null
          warranty_provider?: string | null
          warranty_service_method?: Database["public"]["Enums"]["warranty_service_method"] | null
          warranty_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      get_visible_coupons: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          description: string | null
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          max_discount_cents: number | null
          min_order_cents: number | null
          visibility: Database["public"]["Enums"]["coupon_visibility"]
        }[]
      }
      validate_coupon: {
        Args: {
          p_code: string
          p_user_id: string | null
          p_items: Json
        }
        Returns: Json
      }
      get_coupon_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          coupon_id: string
          usage_count: number
          total_discount_cents: number
          revenue_cents: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      order_status:
        | "pending"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      warranty_type: "manufacturer" | "seller" | "extended"
      warranty_service_method:
        | "home_service"
        | "authorized_service_center"
        | "bring_to_store"
        | "carry_in_service"
        | "on_site_service"
      coupon_discount_type: "percentage" | "fixed" | "free_shipping"
      coupon_visibility: "visible" | "hidden" | "auto_apply"
      coupon_customer_type: "any" | "new" | "existing"
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
      app_role: ["admin", "customer"],
      order_status: [
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      warranty_type: ["manufacturer", "seller", "extended"],
      warranty_service_method: [
        "home_service",
        "authorized_service_center",
        "bring_to_store",
        "carry_in_service",
        "on_site_service",
      ],
      coupon_discount_type: ["percentage", "fixed", "free_shipping"],
      coupon_visibility: ["visible", "hidden", "auto_apply"],
      coupon_customer_type: ["any", "new", "existing"],
    },
  },
} as const
