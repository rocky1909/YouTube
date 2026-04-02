import Link from "next/link";
import type { Route } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const links: Array<{ href: Route; label: string }> = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Studio" }
];

export async function NavHeader() {
  let userEmail: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    userEmail = userResult.data.user?.email ?? null;
  }

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
          {isSupabaseConfigured() ? (
            userEmail ? (
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-coral/40 px-3 py-1.5 text-sm text-paper transition hover:bg-coral/20"
                >
                  Logout
                </button>
              </form>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-full border border-lagoon/40 px-3 py-1.5 text-sm text-paper transition hover:bg-lagoon/20"
              >
                Login
              </Link>
            )
          ) : null}
        </nav>
      </div>
    </header>
  );
}
