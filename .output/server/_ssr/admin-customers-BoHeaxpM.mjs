import { t as supabase } from "./client-C6ZaJElq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-customers-BoHeaxpM.js
/** Paginated, searchable customer directory (name / email / phone /
* Customer ID) backing Admin -> Users. */
async function adminListCustomers(search, limit, offset) {
	const { data, error } = await supabase.rpc("admin_list_customers", {
		p_search: search.trim() || null,
		p_limit: limit,
		p_offset: offset
	});
	if (error) throw error;
	const rows = data ?? [];
	return {
		rows,
		totalCount: rows[0]?.total_count ?? 0
	};
}
async function adminGetCustomer(userId) {
	const { data, error } = await supabase.rpc("admin_get_customer", { p_user_id: userId });
	if (error) throw error;
	return (data ?? [])[0] ?? null;
}
/** Grant or revoke admin access. The RPC itself blocks self-demotion and
* demoting the last remaining admin — this is just the client wrapper. */
async function adminSetAdminRole(userId, makeAdmin) {
	const { data, error } = await supabase.rpc("admin_set_admin_role", {
		p_user_id: userId,
		p_make_admin: makeAdmin
	});
	if (error) return {
		success: false,
		message: error.message
	};
	return data;
}
//#endregion
export { adminListCustomers as n, adminSetAdminRole as r, adminGetCustomer as t };
