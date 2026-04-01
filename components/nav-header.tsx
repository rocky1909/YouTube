import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Studio" }
];

export function NavHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b1acc] backdrop-blur">
      <div className="app-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="pulse-dot h-8 w-8 rounded-full bg-coral text-coral" />
          <div>
            <p className="text-sm font-semibold tracking-[0.15em] text-paper/95">
              YOUTUBE AGENTIC STUDIO
            </p>
            <p className="text-xs text-paper/60">Prompt to publish assistant</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-paper/85 transition hover:border-white/30 hover:bg-white/5"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
