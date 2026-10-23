import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://sanjayelectricals.shop";

// Pages worth putting in front of search engines. Auth-gated pages
// (cart, orders, profile, wallet, support, admin/*) and the dynamic
// /search results page are deliberately left out.
const STATIC_PATHS = [
  "",
  "/about",
  "/collections",
  "/contact",
  "/privacy-policy",
  "/returns-policy",
  "/shipping-policy",
  "/terms",
  "/warranty-policy",
];

function xmlEscape(value: string) {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

function urlEntry(loc: string, lastmod?: string | null) {
  const lastmodTag = lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : "";
  return `<url><loc>${xmlEscape(loc)}</loc>${lastmodTag}</url>`;
}

// Regenerated on every request (no build step involved), so new products
// and categories show up without needing a redeploy. Uses the service-role
// client like the other api.*.ts server routes — this only ever reads
// public, already-active catalog data, same as what an anonymous shopper
// can already see.
export const Route = createFileRoute("/api/sitemap")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [{ data: products }, { data: categories }] = await Promise.all([
          supabaseAdmin.from("products").select("slug, updated_at").eq("active", true),
          supabaseAdmin.from("categories").select("slug"),
        ]);

        const entries = [
          ...STATIC_PATHS.map((path) => urlEntry(`${SITE_URL}${path}`)),
          ...(products ?? []).map((p) => urlEntry(`${SITE_URL}/product/${p.slug}`, p.updated_at)),
          ...(categories ?? []).map((c) => urlEntry(`${SITE_URL}/category/${c.slug}`)),
        ];

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          entries.join("\n") +
          `\n</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
