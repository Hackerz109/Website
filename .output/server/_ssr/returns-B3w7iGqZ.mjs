import { t as supabase } from "./client-C6ZaJElq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/returns-B3w7iGqZ.js
/** Uploads return evidence photos to the private return-images bucket under
* {user_id}/{returnId}/... and resolves with their storage paths (not
* public URLs — the bucket is private, so paths are resolved to signed
* URLs on read via getReturnImageUrl). */
async function uploadReturnImages(userId, returnId, files) {
	const paths = [];
	for (const file of files) {
		const ext = file.name.split(".").pop() || "jpg";
		const path = `${userId}/${returnId}/${crypto.randomUUID()}.${ext}`;
		const { error } = await supabase.storage.from("return-images").upload(path, file);
		if (error) throw error;
		paths.push(path);
	}
	return paths;
}
async function getReturnImageUrl(path) {
	const { data, error } = await supabase.storage.from("return-images").createSignedUrl(path, 3600);
	if (error) return null;
	return data?.signedUrl ?? null;
}
async function createReturnRequest(params) {
	const { data, error } = await supabase.rpc("create_return_request", {
		p_order_id: params.orderId,
		p_items: params.items,
		p_reason: params.reason,
		p_preferred_refund_method: params.preferredRefundMethod,
		p_image_urls: params.imagePaths,
		p_id: params.id
	});
	if (error) return {
		success: false,
		message: error.message
	};
	return data;
}
async function fetchMyReturns(userId) {
	const { data, error } = await supabase.from("return_requests").select("*, return_items(*), return_images(*)").eq("user_id", userId).order("created_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
}
async function adminReviewReturn(returnId, decision, adminNotes, itemDecisions = []) {
	const { data, error } = await supabase.rpc("admin_review_return", {
		p_return_id: returnId,
		p_decision: decision,
		p_admin_notes: adminNotes || null,
		p_item_decisions: itemDecisions
	});
	if (error) return {
		success: false,
		message: error.message
	};
	return data;
}
async function adminProcessRefund(returnId, method, externalRef) {
	const { data, error } = await supabase.rpc("admin_process_refund", {
		p_return_id: returnId,
		p_method: method,
		p_external_ref: externalRef ?? null
	});
	if (error) return {
		success: false,
		message: error.message
	};
	return data;
}
function returnStatusLabel(status) {
	switch (status) {
		case "requested": return "Requested";
		case "approved": return "Approved";
		case "partially_approved": return "Partially Approved";
		case "rejected": return "Rejected";
		case "refunded": return "Refunded";
		default: return status;
	}
}
function returnStatusBadgeClass(status) {
	switch (status) {
		case "requested": return "bg-amber-100 text-amber-700 hover:bg-amber-100";
		case "approved":
		case "partially_approved": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
		case "rejected": return "bg-red-100 text-red-700 hover:bg-red-100";
		case "refunded": return "bg-green-100 text-green-700 hover:bg-green-100";
		default: return "bg-secondary text-secondary-foreground hover:bg-secondary";
	}
}
//#endregion
export { getReturnImageUrl as a, uploadReturnImages as c, fetchMyReturns as i, adminReviewReturn as n, returnStatusBadgeClass as o, createReturnRequest as r, returnStatusLabel as s, adminProcessRefund as t };
