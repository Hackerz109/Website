import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserAddress = Database["public"]["Tables"]["user_addresses"]["Row"];

export interface ProfileRpcResult {
  success: boolean;
  message?: string;
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(
  userId: string,
  patch: { full_name?: string | null; phone?: string | null; avatar_url?: string | null },
): Promise<ProfileRpcResult> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

/** Best-effort "last seen" ping — called once per session from useAuth.
 * Never throws; a failure here should never block the app from loading. */
export async function touchLastSeen(): Promise<void> {
  try {
    await supabase.rpc("touch_last_seen");
  } catch {
    // Non-critical — ignore.
  }
}

/** Uploads a new avatar to the public `avatars` bucket under
 * {user_id}/{file} and returns its public URL. The old file (if any) is
 * left in storage — cheap, and avoids a delete racing the profile update. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchMyAddresses(userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface AddressInput {
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export async function createAddress(userId: string, input: AddressInput): Promise<ProfileRpcResult> {
  const { error } = await supabase.from("user_addresses").insert({ user_id: userId, ...input });
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<ProfileRpcResult> {
  const { error } = await supabase.from("user_addresses").update(input).eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function deleteAddress(id: string): Promise<ProfileRpcResult> {
  const { error } = await supabase.from("user_addresses").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

export async function changePassword(newPassword: string): Promise<ProfileRpcResult> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, message: error.message };
  return { success: true };
}
