import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ReturnRequest = Database["public"]["Tables"]["return_requests"]["Row"];
export type ReturnItem = Database["public"]["Tables"]["return_items"]["Row"];
export type ReturnImage = Database["public"]["Tables"]["return_images"]["Row"];
export type RefundMethod = Database["public"]["Enums"]["refund_method_type"];
export type ReturnStatus = Database["public"]["Enums"]["return_status"];

export type ReturnRequestWithDetails = ReturnRequest & {
  return_items: ReturnItem[];
  return_images: ReturnImage[];
};

export interface ReturnRpcResult {
  success: boolean;
  message?: string;
  return_id?: string;
  refund_amount_cents?: number;
}

/** Uploads return evidence photos to the private return-images bucket under
 * {user_id}/{returnId}/... and resolves with their storage paths (not
 * public URLs — the bucket is private, so paths are resolved to signed
 * URLs on read via getReturnImageUrl). */
export async function uploadReturnImages(userId: string, returnId: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${returnId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("return-images").upload(path, file);
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export async function getReturnImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("return-images").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export interface ReturnItemInput {
  order_item_id: string;
  quantity: number;
  reason?: string;
}

export async function createReturnRequest(params: {
  orderId: string;
  items: ReturnItemInput[];
  reason: string;
  preferredRefundMethod: RefundMethod;
  imagePaths: string[];
  id: string;
}): Promise<ReturnRpcResult> {
  const { data, error } = await supabase.rpc("create_return_request", {
    p_order_id: params.orderId,
    p_items: params.items,
    p_reason: params.reason,
    p_preferred_refund_method: params.preferredRefundMethod,
    p_image_urls: params.imagePaths,
    p_id: params.id,
  });
  if (error) return { success: false, message: error.message };
  return data as unknown as ReturnRpcResult;
}

export async function fetchMyReturns(userId: string): Promise<ReturnRequestWithDetails[]> {
  const { data, error } = await supabase
    .from("return_requests")
    .select("*, return_items(*), return_images(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReturnRequestWithDetails[];
}

export async function fetchAllReturns(): Promise<ReturnRequestWithDetails[]> {
  const { data, error } = await supabase
    .from("return_requests")
    .select("*, return_items(*), return_images(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReturnRequestWithDetails[];
}

export interface ItemDecision {
  return_item_id: string;
  approved_quantity: number;
}

export async function adminReviewReturn(
  returnId: string,
  decision: "approved" | "partially_approved" | "rejected",
  adminNotes: string,
  itemDecisions: ItemDecision[] = [],
): Promise<ReturnRpcResult> {
  const { data, error } = await supabase.rpc("admin_review_return", {
    p_return_id: returnId,
    p_decision: decision,
    p_admin_notes: adminNotes || null,
    p_item_decisions: itemDecisions,
  });
  if (error) return { success: false, message: error.message };
  return data as unknown as ReturnRpcResult;
}

export async function adminProcessRefund(
  returnId: string,
  method: RefundMethod,
  externalRef?: string,
): Promise<ReturnRpcResult> {
  const { data, error } = await supabase.rpc("admin_process_refund", {
    p_return_id: returnId,
    p_method: method,
    p_external_ref: externalRef ?? null,
  });
  if (error) return { success: false, message: error.message };
  return data as unknown as ReturnRpcResult;
}

export function returnStatusLabel(status: ReturnStatus): string {
  switch (status) {
    case "requested":
      return "Requested";
    case "approved":
      return "Approved";
    case "partially_approved":
      return "Partially Approved";
    case "rejected":
      return "Rejected";
    case "refunded":
      return "Refunded";
    default:
      return status;
  }
}

export function returnStatusBadgeClass(status: ReturnStatus): string {
  switch (status) {
    case "requested":
      return "bg-amber-100 text-amber-700 hover:bg-amber-100";
    case "approved":
    case "partially_approved":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    case "rejected":
      return "bg-red-100 text-red-700 hover:bg-red-100";
    case "refunded":
      return "bg-green-100 text-green-700 hover:bg-green-100";
    default:
      return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
}
