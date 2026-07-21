import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { B as MessageCircle, H as MapPin, N as Phone, T as Send, U as Mail, ot as Clock } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/contact-C07URM1H.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var contactDetails = [
	{
		icon: Phone,
		label: "Phone",
		value: "+1 (000) 000-0000",
		href: "tel:+10000000000"
	},
	{
		icon: MessageCircle,
		label: "WhatsApp",
		value: "+1 (000) 000-0000",
		href: "https://wa.me/10000000000"
	},
	{
		icon: Mail,
		label: "Email",
		value: "support@myshop.example",
		href: "mailto:support@myshop.example"
	},
	{
		icon: MapPin,
		label: "Store address",
		value: "123 Market Street, Your City",
		href: void 0
	},
	{
		icon: Clock,
		label: "Business hours",
		value: "Mon–Sat, 9:00 AM – 7:00 PM",
		href: void 0
	}
];
function ContactPage() {
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		email: "",
		message: ""
	});
	const [sending, setSending] = (0, import_react.useState)(false);
	function handleSubmit(e) {
		e.preventDefault();
		if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
			toast.error("Please fill in your name, email, and message.");
			return;
		}
		setSending(true);
		setTimeout(() => {
			setSending(false);
			setForm({
				name: "",
				email: "",
				message: ""
			});
			toast.success("Thanks for reaching out — we'll get back to you shortly.");
		}, 500);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-5xl px-6 py-14 md:py-20",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-extrabold tracking-tight text-foreground md:text-4xl",
						children: "We're here to help"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground",
						children: "Whether you have a question before purchasing or need assistance after your order, our team is always happy to assist. Reach out however's easiest for you."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-10 grid gap-10 md:grid-cols-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "md:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-4",
								children: contactDetails.map(({ icon: Icon, label, value, href }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-primary",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-medium text-muted-foreground",
										children: label
									}), href ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href,
										target: href.startsWith("http") ? "_blank" : void 0,
										rel: "noreferrer",
										className: "text-sm font-semibold text-foreground hover:text-primary",
										children: value
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-semibold text-foreground",
										children: value
									})] })]
								}, label))
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: handleSubmit,
							className: "md:col-span-3 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-lg font-semibold text-foreground",
									children: "Send us a message"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "name",
									children: "Your name"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "name",
									value: form.name,
									onChange: (e) => setForm({
										...form,
										name: e.target.value
									}),
									placeholder: "Jane Doe"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "email",
									children: "Email address"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "email",
									type: "email",
									value: form.email,
									onChange: (e) => setForm({
										...form,
										email: e.target.value
									}),
									placeholder: "you@example.com"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "message",
									children: "How can we help?"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									id: "message",
									rows: 5,
									value: form.message,
									onChange: (e) => setForm({
										...form,
										message: e.target.value
									}),
									placeholder: "Tell us a bit about what you need…"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "submit",
									className: "rounded-xl shadow-soft",
									disabled: sending,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "mr-2 h-4 w-4" }), sending ? "Sending…" : "Send message"]
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
//#endregion
export { ContactPage as component };
