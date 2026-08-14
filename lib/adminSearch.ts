import { supabase } from "@/integrations/supabase/client";

export interface AdminSearchCustomer {
  id: string;
  customer_code: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface AdminSearchOrder {
  id: string;
  customer_name: string | null;
  customer_email: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface AdminSearchProduct {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  currency: string;
  stock: number;
  active: boolean;
}

export interface AdminSearchCoupon {
  id: string;
  code: string;
  description: string | null;
  active: boolean;
  discount_type: string;
  discount_value: number;
}

export interface AdminSearchResults {
  customers: AdminSearchCustomer[];
  orders: AdminSearchOrder[];
  products: AdminSearchProduct[];
  coupons: AdminSearchCoupon[];
  error?: string;
}

const EMPTY: AdminSearchResults = { customers: [], orders: [], products: [], coupons: [] };

export async function adminGlobalSearch(query: string): Promise<AdminSearchResults> {
  const term = query.trim();
  if (term.length < 2) return EMPTY;
  const { data, error } = await supabase.rpc("admin_global_search", { p_query: term });
  if (error || !data) return EMPTY;
  return { ...EMPTY, ...(data as unknown as AdminSearchResults) };
}

export function totalResultCount(r: AdminSearchResults): number {
  return r.customers.length + r.orders.length + r.products.length + r.coupons.length;
}