"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Mode = "login" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        needsEmailConfirmation?: boolean;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Authentication failed.");
      }

      if (mode === "signup" && json.needsEmailConfirmation) {
        setInfo("Account created. Please confirm your email, then log in.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-7">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-paper/55">Team Workspace Access</p>
        <h1 className="mt-2 text-2xl font-semibold text-paper sm:text-3xl">
          {mode === "login" ? "Sign in to your studio" : "Create your studio account"}
        </h1>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "login" ? "bg-paper text-night" : "border border-paper/20 text-paper/80"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "signup" ? "bg-paper text-night" : "border border-paper/20 text-paper/80"
          }`}
        >
          Signup
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-paper/70">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none focus:border-lagoon/60"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-paper/70">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none focus:border-lagoon/60"
          />
        </label>

        {error ? <p className="text-sm text-coral">{error}</p> : null}
        {info ? <p className="text-sm text-lagoon">{info}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-paper px-4 py-2 text-sm font-semibold text-night transition hover:translate-y-[-1px] disabled:opacity-60"
        >
          {busy ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
    </section>
  );
}
