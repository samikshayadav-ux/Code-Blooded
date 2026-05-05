import { AppShell } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsRoute() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Workspace Settings</h1>
          <p className="mt-2 text-sm text-slate-400">
            Adjust the visual experience without changing the reconciliation backend.
          </p>
        </header>

        <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Theme</h2>
              <p className="mt-1 text-sm text-slate-400">Switch between light and dark mode. Your preference is saved locally.</p>
            </div>
            <ThemeToggle />
          </div>
        </section>
      </main>
    </AppShell>
  );
}
