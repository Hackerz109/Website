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
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          delivery_zone_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_distance_km: number | null
          delivery_instructions_snapshot: string | null
          pickup_instructions_snapshot: string | null
          wallet_used_cents: number
          confirmed_at: string | null
          packed_at: string | null
          ready_for_pickup_at: string | null
          out_for_delivery_at: string | null
          delivered_at: string | null
          cancelled_at: string | null
          admin_notes: string | null
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
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          delivery_zone_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_distance_km?: number | null
          delivery_instructions_snapshot?: string | null
          pickup_instructions_snapshot?: string | null
          wallet_used_cents?: number
          confirmed_at?: string | null
          packed_at?: string | null
          ready_for_pickup_at?: string | null
          out_for_delivery_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          admin_notes?: string | null
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
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          delivery_zone_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_distance_km?: number | null
          delivery_instructions_snapshot?: string | null
          pickup_instructions_snapshot?: string | null
          wallet_used_cents?: number
          confirmed_at?: string | null
          packed_at?: string | null
          ready_for_pickup_at?: string | null
          out_for_delivery_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          admin_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
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
      store_locations: {
        Row: {
          id: string
          name: string
          address: string | null
          lat: number
          lng: number
          is_primary: boolean
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          address?: string | null
          lat: number
          lng: number
          is_primary?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          lat?: number
          lng?: number
          is_primary?: boolean
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          id: string
          store_location_id: string
          name: string
          radius_km: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_location_id: string
          name: string
          radius_km: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_location_id?: string
          name?: string
          radius_km?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_store_location_id_fkey"
            columns: ["store_location_id"]
            isOneToOne: false
            referencedRelation: "store_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rate_tiers: {
        Row: {
          id: string
          min_km: number
          max_km: number | null
          charge_cents: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          min_km?: number
          max_km?: number | null
          charge_cents?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          min_km?: number
          max_km?: number | null
          charge_cents?: number
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          id: boolean
          charge_type: Database["public"]["Enums"]["delivery_charge_type"]
          flat_charge_cents: number
          free_delivery_min_cents: number | null
          pickup_charge_cents: number
          delivery_eta_text: string
          pickup_eta_text: string
          delivery_instructions: string | null
          pickup_instructions: string | null
          pickup_address: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          charge_type?: Database["public"]["Enums"]["delivery_charge_type"]
          flat_charge_cents?: number
          free_delivery_min_cents?: number | null
          pickup_charge_cents?: number
          delivery_eta_text?: string
          pickup_eta_text?: string
          delivery_instructions?: string | null
          pickup_instructions?: string | null
          pickup_address?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          charge_type?: Database["public"]["Enums"]["delivery_charge_type"]
          flat_charge_cents?: number
          free_delivery_min_cents?: number | null
          pickup_charge_cents?: number
          delivery_eta_text?: string
          pickup_eta_text?: string
          delivery_instructions?: string | null
          pickup_instructions?: string | null
          pickup_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          note: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          id: string
          order_id: string
          user_id: string
          status: Database["public"]["Enums"]["return_status"]
          reason: string
          preferred_refund_method: Database["public"]["Enums"]["refund_method_type"]
          refund_method: Database["public"]["Enums"]["refund_method_type"] | null
          refund_amount_cents: number
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          refunded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          status?: Database["public"]["Enums"]["return_status"]
          reason: string
          preferred_refund_method?: Database["public"]["Enums"]["refund_method_type"]
          refund_method?: Database["public"]["Enums"]["refund_method_type"] | null
          refund_amount_cents?: number
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          refunded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          user_id?: string
          status?: Database["public"]["Enums"]["return_status"]
          reason?: string
          preferred_refund_method?: Database["public"]["Enums"]["refund_method_type"]
          refund_method?: Database["public"]["Enums"]["refund_method_type"] | null
          refund_amount_cents?: number
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          refunded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          id: string
          return_request_id: string
          order_item_id: string
          quantity: number
          approved_quantity: number | null
          unit_price_cents: number
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          return_request_id: string
          order_item_id: string
          quantity: number
          approved_quantity?: number | null
          unit_price_cents: number
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          return_request_id?: string
          order_item_id?: string
          quantity?: number
          approved_quantity?: number | null
          unit_price_cents?: number
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      return_images: {
        Row: {
          id: string
          return_request_id: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          return_request_id: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          return_request_id?: string
          url?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_images_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          id: string
          user_id: string
          amount_cents: number
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          reference_order_id: string | null
          reference_return_id: string | null
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount_cents: number
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          reference_order_id?: string | null
          reference_return_id?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount_cents?: number
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          reference_order_id?: string | null
          reference_return_id?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_reference_order_id_fkey"
            columns: ["reference_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_reference_return_id_fkey"
            columns: ["reference_return_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
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
          customer_code: string
          phone: string | null
          avatar_url: string | null
          last_seen_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          customer_code?: string
          phone?: string | null
          avatar_url?: string | null
          last_seen_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          customer_code?: string
          phone?: string | null
          avatar_url?: string | null
          last_seen_at?: string | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          id: string
          user_id: string
          label: string
          full_name: string | null
          phone: string | null
          line1: string
          line2: string | null
          city: string
          state: string
          pincode: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label?: string
          full_name?: string | null
          phone?: string | null
          line1: string
          line2?: string | null
          city: string
          state: string
          pincode: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          full_name?: string | null
          phone?: string | null
          line1?: string
          line2?: string | null
          city?: string
          state?: string
          pincode?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
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
      get_offers_for_product: {
        Args: {
          p_product_id: string
          p_category_id: string | null
          p_brand_id: string | null
          p_user_id?: string | null
        }
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
      get_offers_for_cart: {
        Args: {
          p_items: Json
          p_user_id?: string | null
        }
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
      get_eligible_coupons: {
        Args: {
          p_user_id?: string | null
        }
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
      haversine_km: {
        Args: {
          lat1: number
          lng1: number
          lat2: number
          lng2: number
        }
        Returns: number
      }
      check_delivery_eligibility: {
        Args: {
          p_lat: number
          p_lng: number
        }
        Returns: Json
      }
      calculate_delivery_charge: {
        Args: {
          p_lat: number
          p_lng: number
          p_subtotal_cents: number
        }
        Returns: Json
      }
      get_delivery_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_return_request: {
        Args: {
          p_order_id: string
          p_items: Json
          p_reason: string
          p_preferred_refund_method: Database["public"]["Enums"]["refund_method_type"]
          p_image_urls?: string[]
          p_id?: string | null
        }
        Returns: Json
      }
      admin_review_return: {
        Args: {
          p_return_id: string
          p_decision: Database["public"]["Enums"]["return_status"]
          p_admin_notes?: string | null
          p_item_decisions?: Json
        }
        Returns: Json
      }
      admin_process_refund: {
        Args: {
          p_return_id: string
          p_method: Database["public"]["Enums"]["refund_method_type"]
          p_external_ref?: string | null
        }
        Returns: Json
      }
      wallet_redeem_for_order: {
        Args: {
          p_order_id: string
          p_amount_cents: number
        }
        Returns: Json
      }
      admin_wallet_adjust: {
        Args: {
          p_user_id: string
          p_amount_cents: number
          p_reason: string
        }
        Returns: Json
      }
      admin_search_customers: {
        Args: {
          p_query: string
        }
        Returns: {
          id: string
          email: string | null
          full_name: string | null
        }[]
      }
      touch_last_seen: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      admin_list_customers: {
        Args: {
          p_search?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          customer_code: string
          email: string | null
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          last_seen_at: string | null
          is_admin: boolean
          order_count: number
          total_spent_cents: number
          wallet_balance_cents: number
          total_count: number
        }[]
      }
      admin_get_customer: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          customer_code: string
          email: string | null
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          last_seen_at: string | null
          is_admin: boolean
          order_count: number
          total_spent_cents: number
          wallet_balance_cents: number
        }[]
      }
      admin_set_admin_role: {
        Args: {
          p_user_id: string
          p_make_admin: boolean
        }
        Returns: Json
      }
      admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
        | "confirmed"
        | "packed"
        | "ready_for_pickup"
        | "out_for_delivery"
        | "return_requested"
        | "return_approved"
        | "return_rejected"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      fulfillment_type: "delivery" | "pickup"
      delivery_charge_type: "flat" | "distance"
      return_status:
        | "requested"
        | "approved"
        | "partially_approved"
        | "rejected"
        | "refunded"
      refund_method_type: "original_payment" | "wallet_credit"
      wallet_transaction_type: "credit" | "debit" | "refund" | "adjustment"
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
        "confirmed",
        "packed",
        "ready_for_pickup",
        "out_for_delivery",
        "return_requested",
        "return_approved",
        "return_rejected",
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
      fulfillment_type: ["delivery", "pickup"],
      delivery_charge_type: ["flat", "distance"],
      return_status: [
        "requested",
        "approved",
        "partially_approved",
        "rejected",
        "refunded",
      ],
      refund_method_type: ["original_payment", "wallet_credit"],
      wallet_transaction_type: ["credit", "debit", "refund", "adjustment"],
    },
  },
} as const
