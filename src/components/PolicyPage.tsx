import type { ReactNode } from "react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";

export function PolicyPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>}
        <div className="policy-content mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:marker:text-primary">
          {children}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}
