import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useAuth-wDRVmRFv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
async function fetchMyProfile(userId) {
	const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
	if (error) throw error;
	return data;
}
async function updateMyProfile(userId, patch) {
	const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
	if (error) return {
		success: false,
		message: error.message
	};
	return { success: true };
}
/** Best-effort "last seen" ping — called once per session from useAuth.
* Never throws; a failure here should never block the app from loading. */
async function touchLastSeen() {
	try {
		await supabase.rpc("touch_last_seen");
	} catch {}
}
/** Uploads a new avatar to the public `avatars` bucket under
* {user_id}/{file} and returns its public URL. The old file (if any) is
* left in storage — cheap, and avoids a delete racing the profile update. */
async function uploadAvatar(userId, file) {
	const ext = file.name.split(".").pop() || "jpg";
	const path = `${userId}/${crypto.randomUUID()}.${ext}`;
	const { error } = await supabase.storage.from("avatars").upload(path, file);
	if (error) throw error;
	const { data } = supabase.storage.from("avatars").getPublicUrl(path);
	return data.publicUrl;
}
async function fetchMyAddresses(userId) {
	const { data, error } = await supabase.from("user_addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false }).order("created_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
}
async function createAddress(userId, input) {
	const { error } = await supabase.from("user_addresses").insert({
		user_id: userId,
		...input
	});
	if (error) return {
		success: false,
		message: error.message
	};
	return { success: true };
}
async function updateAddress(id, input) {
	const { error } = await supabase.from("user_addresses").update(input).eq("id", id);
	if (error) return {
		success: false,
		message: error.message
	};
	return { success: true };
}
async function deleteAddress(id) {
	const { error } = await supabase.from("user_addresses").delete().eq("id", id);
	if (error) return {
		success: false,
		message: error.message
	};
	return { success: true };
}
async function changePassword(newPassword) {
	const { error } = await supabase.auth.updateUser({ password: newPassword });
	if (error) return {
		success: false,
		message: error.message
	};
	return { success: true };
}
function useAuth() {
	const [session, setSession] = (0, import_react.useState)(null);
	const [user, setUser] = (0, import_react.useState)(null);
	const [isAdmin, setIsAdmin] = (0, import_react.useState)(false);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
			setSession(s);
			setUser(s?.user ?? null);
		});
		supabase.auth.getSession().then(({ data }) => {
			setSession(data.session);
			setUser(data.session?.user ?? null);
			setLoading(false);
		});
		return () => sub.subscription.unsubscribe();
	}, []);
	const userId = user?.id;
	(0, import_react.useEffect)(() => {
		if (!userId) {
			setIsAdmin(false);
			return;
		}
		supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle().then(({ data }) => setIsAdmin(!!data));
	}, [userId]);
	(0, import_react.useEffect)(() => {
		if (!userId) {
			setProfile(null);
			return;
		}
		fetchMyProfile(userId).then(setProfile).catch(() => setProfile(null));
		touchLastSeen();
	}, [userId]);
	function refreshProfile() {
		if (userId) fetchMyProfile(userId).then(setProfile).catch(() => {});
	}
	return {
		session,
		user,
		isAdmin,
		profile,
		refreshProfile,
		loading
	};
}
//#endregion
export { updateAddress as a, useAuth as c, fetchMyAddresses as i, createAddress as n, updateMyProfile as o, deleteAddress as r, uploadAvatar as s, changePassword as t };
