import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="app-shell py-12">
        <section className="glass-card rounded-3xl p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-paper/55">Setup Required</p>
          <h1 className="mt-2 text-3xl font-semibold text-paper">Supabase env vars are missing</h1>
          <p className="mt-3 text-paper/75">
            Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to
            enable auth and team workspace features.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth.getUser();
  if (authResult.data.user) {
    redirect("/dashboard");
  }

  return (
    <main className="app-shell py-12">
      <AuthForm />
    </main>
  );
}
