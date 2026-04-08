import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WebAppClient } from "./web-app-client";

export const metadata: Metadata = {
  title: "Offdex Web UI",
  description: "Use your live Codex session from the browser.",
};

export default function WebAppPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(16,163,127,0.18),transparent_28%),radial-gradient(circle_at_82%_4%,rgba(203,255,229,0.08),transparent_26%),linear-gradient(145deg,#070807,#0e1411_45%,#080908)]" />
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            O
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">Offdex</span>
            <span className="block text-xs text-muted-foreground">Codex web app</span>
          </span>
        </Link>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Same bridge as mobile
        </div>
      </header>
      <Suspense fallback={<div className="mx-auto max-w-7xl px-5 pb-8 text-sm text-muted-foreground md:px-8">Loading Offdex web app...</div>}>
        <WebAppClient />
      </Suspense>
    </main>
  );
}
