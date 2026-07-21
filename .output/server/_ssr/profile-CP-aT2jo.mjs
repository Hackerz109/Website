import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { n as initials } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { n as AvatarFallback, r as AvatarImage, t as Avatar } from "./avatar-CppsvtHo.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { a as updateAddress, c as useAuth, i as fetchMyAddresses, n as createAddress, o as updateMyProfile, r as deleteAddress, s as uploadAvatar, t as changePassword } from "./useAuth-wDRVmRFv.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { Ct as ArrowRight, F as Pencil, G as Lock, I as Package, Q as House, _ as Star, _t as Camera, at as Copy, bt as Building2, d as Trash2, gt as Check, i as Wallet, j as Plus, q as LoaderCircle } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-DJ00V9Pn.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-BrvgweL9.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as sumBalance, n as fetchWalletTransactions } from "./wallet-i5A9tLwA.mjs";
import { t as Checkbox } from "./checkbox-CjumKS33.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-CP-aT2jo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const { user, profile, loading, refreshProfile } = useAuth();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (!loading && !user) navigate({ to: "/auth" });
	}, [
		loading,
		user,
		navigate
	]);
	const { data: orderCount } = useQuery({
		enabled: !!user,
		queryKey: ["profile-order-count", user?.id],
		queryFn: async () => {
			const { count, error } = await supabase.from("orders").select("id", {
				count: "exact",
				head: true
			}).eq("user_id", user.id);
			if (error) throw error;
			return count ?? 0;
		}
	});
	const { data: walletTx } = useQuery({
		enabled: !!user,
		queryKey: ["wallet-transactions", user?.id],
		queryFn: () => fetchWalletTransactions(user.id)
	});
	const walletBalance = sumBalance(walletTx ?? []);
	if (!user || !profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-16 text-center text-sm text-muted-foreground",
			children: "Loading your profile…"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-2xl px-6 py-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-semibold tracking-tight",
						children: "My Profile"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: "Manage your details, saved addresses, and account security."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileHero, {
						profile,
						email: user.email ?? "",
						userId: user.id,
						onAvatarChange: refreshProfile
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/orders",
							className: "rounded-xl border p-4 transition-colors hover:bg-secondary/40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "h-4 w-4" }), " Orders"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3.5 w-3.5 text-muted-foreground" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xl font-semibold",
								children: orderCount ?? "—"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/wallet",
							className: "rounded-xl border p-4 transition-colors hover:bg-secondary/40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-sm text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "h-4 w-4" }), " Wallet balance"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3.5 w-3.5 text-muted-foreground" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xl font-semibold",
								children: formatMoney(walletBalance)
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
						defaultValue: "details",
						className: "mt-8",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
								className: "grid w-full grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
										value: "details",
										children: "Details"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
										value: "addresses",
										children: "Addresses"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
										value: "security",
										children: "Security"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
								value: "details",
								className: "mt-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileDetailsForm, {
									profile,
									onSaved: refreshProfile
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
								value: "addresses",
								className: "mt-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddressesSection, { userId: user.id })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
								value: "security",
								className: "mt-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PasswordForm, {})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
function ProfileHero({ profile, email, userId, onAvatarChange }) {
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const fileInputRef = (0, import_react.useRef)(null);
	async function handleAvatarPick(e) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		setUploading(true);
		try {
			const result = await updateMyProfile(userId, { avatar_url: await uploadAvatar(userId, file) });
			if (!result.success) throw new Error(result.message);
			onAvatarChange();
			toast.success("Profile photo updated");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Couldn't update your photo");
		} finally {
			setUploading(false);
		}
	}
	function copyCode() {
		navigator.clipboard.writeText(profile.customer_code);
		setCopied(true);
		toast.success("Customer ID copied");
		setTimeout(() => setCopied(false), 1500);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-shrink-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Avatar, {
							className: "h-16 w-16 border-2 border-background shadow-soft",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarImage, {
								src: profile.avatar_url ?? void 0,
								alt: ""
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarFallback, {
								className: "bg-primary/15 text-lg font-semibold text-primary",
								children: initials(profile.full_name, email)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => fileInputRef.current?.click(),
							disabled: uploading,
							className: "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-60",
							children: uploading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-3 w-3" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: fileInputRef,
							type: "file",
							accept: "image/*",
							className: "hidden",
							onChange: handleAvatarPick
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-lg font-semibold",
							children: profile.full_name || "Add your name"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm text-muted-foreground",
							children: email
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: [
								"Member since",
								" ",
								new Date(profile.created_at).toLocaleDateString(void 0, {
									month: "long",
									year: "numeric"
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: copyCode,
				className: "mt-4 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-background/60 px-3.5 py-2.5 text-left transition-colors hover:bg-background",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-wide text-muted-foreground",
					children: "Your Customer ID"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-sm font-semibold",
					children: profile.customer_code
				})] }), copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 text-green-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4 text-muted-foreground" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-[11px] text-muted-foreground",
				children: "Share this ID with support so we can find your account quickly."
			})
		]
	});
}
function ProfileDetailsForm({ profile, onSaved }) {
	const [fullName, setFullName] = (0, import_react.useState)(profile.full_name ?? "");
	const [phone, setPhone] = (0, import_react.useState)(profile.phone ?? "");
	const [saving, setSaving] = (0, import_react.useState)(false);
	async function save() {
		setSaving(true);
		const result = await updateMyProfile(profile.id, {
			full_name: fullName.trim() || null,
			phone: phone.trim() || null
		});
		setSaving(false);
		if (!result.success) return toast.error(result.message ?? "Couldn't save your details");
		toast.success("Profile updated");
		onSaved();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 rounded-xl border p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "pf-name",
				children: "Full name"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "pf-name",
				value: fullName,
				onChange: (e) => setFullName(e.target.value),
				placeholder: "Your name"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "pf-phone",
				children: "Mobile number"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "pf-phone",
				value: phone,
				onChange: (e) => setPhone(e.target.value),
				placeholder: "10-digit mobile number"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: profile.email ?? "",
					disabled: true,
					className: "bg-secondary/40 text-muted-foreground"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Contact support to change your email address."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: save,
				disabled: saving,
				className: "w-full",
				children: saving ? "Saving…" : "Save changes"
			})
		]
	});
}
function PasswordForm() {
	const [pw, setPw] = (0, import_react.useState)("");
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	async function save() {
		if (pw.length < 6) return toast.error("Password should be at least 6 characters");
		if (pw !== confirm) return toast.error("Passwords don't match");
		setSaving(true);
		const result = await changePassword(pw);
		setSaving(false);
		if (!result.success) return toast.error(result.message ?? "Couldn't update your password");
		setPw("");
		setConfirm("");
		toast.success("Password updated");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 rounded-xl border p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-sm font-medium",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "h-4 w-4" }), " Change password"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "pw-new",
				children: "New password"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "pw-new",
				type: "password",
				value: pw,
				onChange: (e) => setPw(e.target.value),
				placeholder: "At least 6 characters"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				htmlFor: "pw-confirm",
				children: "Confirm new password"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				id: "pw-confirm",
				type: "password",
				value: confirm,
				onChange: (e) => setConfirm(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: save,
				disabled: saving,
				className: "w-full",
				children: saving ? "Updating…" : "Update password"
			})
		]
	});
}
function AddressesSection({ userId }) {
	const qc = useQueryClient();
	const [dialogOpen, setDialogOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const { data: addresses, isLoading } = useQuery({
		queryKey: ["my-addresses", userId],
		queryFn: () => fetchMyAddresses(userId)
	});
	function refresh() {
		qc.invalidateQueries({ queryKey: ["my-addresses", userId] });
	}
	function openNew() {
		setEditing(null);
		setDialogOpen(true);
	}
	function openEdit(addr) {
		setEditing(addr);
		setDialogOpen(true);
	}
	async function remove(addr) {
		if (!confirm(`Delete the "${addr.label}" address?`)) return;
		const result = await deleteAddress(addr.id);
		if (!result.success) return toast.error(result.message ?? "Couldn't delete address");
		toast.success("Address deleted");
		refresh();
	}
	async function makeDefault(addr) {
		const result = await updateAddress(addr.id, { is_default: true });
		if (!result.success) return toast.error(result.message ?? "Couldn't update address");
		refresh();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium",
				children: "Saved addresses"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "outline",
				onClick: openNew,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-3.5 w-3.5" }), " Add address"]
			})]
		}),
		isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-3 h-20 animate-pulse rounded-xl bg-secondary/50" }) : !addresses || addresses.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground",
			children: "No saved addresses yet."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 space-y-2.5",
			children: addresses.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary",
								children: a.label.toLowerCase() === "work" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "h-3.5 w-3.5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium",
								children: a.label
							}), a.is_default && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								className: "mt-0.5 text-[10px]",
								children: "Default"
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-shrink-0 gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								className: "h-7 w-7",
								onClick: () => openEdit(a),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								className: "h-7 w-7 text-red-600 hover:text-red-600",
								onClick: () => remove(a),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2.5 text-sm text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-foreground",
								children: [a.full_name, a.phone && ` · ${a.phone}`]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [a.line1, a.line2 && `, ${a.line2}`] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								a.city,
								", ",
								a.state,
								" - ",
								a.pincode
							] })
						]
					}),
					!a.is_default && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => makeDefault(a),
						className: "mt-2 flex items-center gap-1 text-xs text-primary hover:underline",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3" }), " Set as default"]
					})
				]
			}, a.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
			open: dialogOpen,
			onOpenChange: setDialogOpen,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddressFormDialog, {
				userId,
				existing: editing,
				onDone: () => {
					setDialogOpen(false);
					refresh();
				}
			}) })
		})
	] });
}
function AddressFormDialog({ userId, existing, onDone }) {
	const [form, setForm] = (0, import_react.useState)({
		label: existing?.label ?? "Home",
		full_name: existing?.full_name ?? "",
		phone: existing?.phone ?? "",
		line1: existing?.line1 ?? "",
		line2: existing?.line2 ?? "",
		city: existing?.city ?? "",
		state: existing?.state ?? "",
		pincode: existing?.pincode ?? "",
		is_default: existing?.is_default ?? false
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	function set(key, value) {
		setForm((f) => ({
			...f,
			[key]: value
		}));
	}
	async function submit() {
		if (!form.full_name.trim() || !form.phone.trim() || !form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) return toast.error("Please fill in all required fields");
		setSaving(true);
		const result = existing ? await updateAddress(existing.id, form) : await createAddress(userId, form);
		setSaving(false);
		if (!result.success) return toast.error(result.message ?? "Couldn't save address");
		toast.success(existing ? "Address updated" : "Address added");
		onDone();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: existing ? "Edit address" : "Add a new address" }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-h-[65vh] space-y-3 overflow-y-auto py-1 pr-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "addr-label",
					children: "Label"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "addr-label",
					value: form.label,
					onChange: (e) => set("label", e.target.value),
					placeholder: "Home, Work…"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "addr-name",
						children: "Full name"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "addr-name",
						value: form.full_name,
						onChange: (e) => set("full_name", e.target.value)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "addr-phone",
						children: "Phone"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "addr-phone",
						value: form.phone,
						onChange: (e) => set("phone", e.target.value)
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "addr-line1",
					children: "Address line 1"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "addr-line1",
					value: form.line1,
					onChange: (e) => set("line1", e.target.value),
					placeholder: "House no., street"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "addr-line2",
					children: "Address line 2 (optional)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					id: "addr-line2",
					value: form.line2,
					onChange: (e) => set("line2", e.target.value),
					placeholder: "Landmark, area"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-3 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "addr-city",
							children: "City"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "addr-city",
							value: form.city,
							onChange: (e) => set("city", e.target.value)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "addr-state",
							children: "State"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "addr-state",
							value: form.state,
							onChange: (e) => set("state", e.target.value)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "addr-pin",
							children: "Pincode"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "addr-pin",
							value: form.pincode,
							onChange: (e) => set("pincode", e.target.value)
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 pt-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
						id: "addr-default",
						checked: form.is_default,
						onCheckedChange: (v) => set("is_default", !!v)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "addr-default",
						className: "font-normal",
						children: "Set as default address"
					})]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			onClick: submit,
			disabled: saving,
			className: "w-full",
			children: saving ? "Saving…" : existing ? "Save changes" : "Add address"
		}) })
	] });
}
//#endregion
export { ProfilePage as component };
