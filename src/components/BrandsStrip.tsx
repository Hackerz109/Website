const BRANDS = [
  { name: "Havells", src: "/brands/havells.png" },
  { name: "Orient Electric", src: "/brands/orient-electric.png" },
  { name: "Anchor by Panasonic", src: "/brands/anchor-panasonic.png" },
  { name: "REO", src: "/brands/reo.png" },
  { name: "KEI Wires & Cables", src: "/brands/kei.png" },
  { name: "Polycab", src: "/brands/polycab.png" },
  { name: "Summercool", src: "/brands/summercool.jpg" },
  { name: "Vansal", src: "/brands/vansal.png" },
  { name: "Crompton", src: "/brands/crompton.png" },
];

function LogoTile({ name, src }: { name: string; src: string }) {
  return (
    <div className="mx-3 flex h-24 w-40 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-card p-4 shadow-soft">
      <img
        src={src}
        alt={name}
        title={name}
        className="max-h-full max-w-full object-contain grayscale opacity-70 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
      />
    </div>
  );
}

export function BrandsStrip() {
  return (
    <section className="border-y border-border bg-card/50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Brands we carry
        </p>
        <h2 className="mt-1 text-center text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
          Genuine products, trusted names
        </h2>
      </div>
      <div className="mt-8 overflow-hidden">
        <div className="brand-track">
          {BRANDS.map((b) => (
            <LogoTile key={`${b.name}-a`} {...b} />
          ))}
          {BRANDS.map((b) => (
            <LogoTile key={`${b.name}-b`} {...b} />
          ))}
        </div>
      </div>
    </section>
  );
}
