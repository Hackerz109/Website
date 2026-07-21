import { supabase } from "@/integrations/supabase/client";

export interface AdminCustomerRow {
  id: string;
  customer_code: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  last_seen_at: string | null;
  is_admin: boolean;
  order_count: number;
  total_spent_cents: number;
  wallet_balance_cents: number;
}

export interface AdminCustomerListResult {
  rows: AdminCustomerRow[];
  totalCount: number;
}

/** Paginated, searchable customer directory (name / email / phone /
 * Customer ID) backing Admin -> Users. */
export async function adminListCustomers(search: string, limit: number, offset: number): Promise<AdminCustomerListResult> {
  const { data, error } = await supabase.rpc("admin_list_customers", {
    p_search: search.trim() || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as (AdminCustomerRow & { total_count: number })[];
  return { rows, totalCount: rows[0]?.total_count ?? 0 };
}

export async function adminGetCustomer(userId: string): Promise<AdminCustomerRow | null> {
  const { data, error } = await supabase.rpc("admin_get_customer", { p_user_id: userId });
  if (error) throw error;
  const rows = (data ?? []) as AdminCustomerRow[];
  return rows[0] ?? null;
}

export interface RoleRpcResult {
  success: boolean;
  message?: string;
}

/** Grant or revoke admin access. The RPC itself blocks self-demotion and
 * demoting the last remaining admin — this is just the client wrapper. */
export async function adminSetAdminRole(userId: string, makeAdmin: boolean): Promise<RoleRpcResult> {
  const { data, error } = await supabase.rpc("admin_set_admin_role", {
    p_user_id: userId,
    p_make_admin: makeAdmin,
  });
  if (error) return { success: false, message: error.message };
  return data as unknown as RoleRpcResult;
}

