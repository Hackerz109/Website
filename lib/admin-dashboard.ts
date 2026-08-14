import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  total_customers: number;
  new_customers_30d: number;
  total_orders: number;
  orders_last_30d: number;
  orders_by_status: Record<string, number>;
  revenue_total_cents: number;
  revenue_30d_cents: number;
  revenue_by_day: { date: string; revenue_cents: number }[];
  wallet_liability_cents: number;
  pending_returns: number;
  low_stock: { id: string; name: string; stock: number }[];
  avg_order_value_cents: number;
  top_products: { product_name: string; units_sold: number; revenue_cents: number }[];
  error?: string;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error) throw error;
  return data as unknown as DashboardStats;
}
