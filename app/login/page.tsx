"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = tab === "signup" ? "/api/signup" : "/api/login";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "signup" ? { email, password, username } : { email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (tab === "signup") {
          setError("Account created successfully. Please log in.");
          setTab("login");
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        setError(data.error || "Failed");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <section className="w-full max-w-md animate-rise-in rounded-lg border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-2xl">
        <Link href="/login" className="mb-6 inline-flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-cyan-300 text-sm font-black text-slate-950">
            DL
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Distributed Logs</span>
            <span className="text-xs text-slate-400">Reconciliation workspace</span>
          </span>
        </Link>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/10 bg-black/20 p-1">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`h-10 rounded-md text-sm font-semibold capitalize transition ${
                tab === item ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/8"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-semibold text-white">
          {tab === "login" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {tab === "login"
            ? "Sign in to continue monitoring distributed log integrity."
            : "Start a new account for the reconciliation dashboard."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {tab === "signup" && (
            <label className="block text-sm font-medium text-slate-300">
              Username
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-white/10 bg-slate-950/55 px-3">
                <UserRound size={17} className="text-cyan-200" aria-hidden />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
                  placeholder="sam"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </span>
            </label>
          )}

          <label className="block text-sm font-medium text-slate-300">
            Email
            <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-white/10 bg-slate-950/55 px-3">
              <Mail size={17} className="text-cyan-200" aria-hidden />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Password
            <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-white/10 bg-slate-950/55 px-3">
              <LockKeyhole size={17} className="text-cyan-200" aria-hidden />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 w-full rounded-md bg-cyan-300 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {loading ? "Loading..." : tab === "login" ? "Login" : "Sign up"}
          </button>
        </form>
      </section>
    </main>
  );
}
