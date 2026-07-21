import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-CBUTxTND.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
/** Two-letter fallback for an avatar — first+last name initials, or the
* first two characters of the email if there's no name on file. */
function initials(name, email) {
	const source = (name ?? "").trim() || (email ?? "");
	if (!source) return "?";
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return source.slice(0, 2).toUpperCase();
}
//#endregion
export { initials as n, cn as t };
