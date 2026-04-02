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
      <div className="app-shell flex flex-col gap-3 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <Link href="/" className="flex w-full items-center gap-3 sm:w-auto">
          <div className="pulse-dot h-8 w-8 rounded-full bg-coral text-coral" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold tracking-[0.12em] text-paper/95 sm:text-sm sm:tracking-[0.15em]">
              YOUTUBE AGENTIC STUDIO
            </p>
            <p className="hidden text-xs text-paper/60 sm:block">Prompt to publish assistant</p>
          </div>
        </Link>
        <nav className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-sm text-paper/85 transition hover:border-white/30 hover:bg-white/5"
            >
              {link.label}
            </Link>
          ))}
          {isSupabaseConfigured() ? (
            userEmail ? (
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-full border border-coral/40 px-3 py-1.5 text-sm text-paper transition hover:bg-coral/20"
                >
                  Logout
                </button>
              </form>
            ) : (
              <Link
                href="/auth/login"
                className="whitespace-nowrap rounded-full border border-lagoon/40 px-3 py-1.5 text-sm text-paper transition hover:bg-lagoon/20"
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
