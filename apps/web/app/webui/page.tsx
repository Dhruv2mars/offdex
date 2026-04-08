import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WebAppClient } from "./web-app-client";

export const metadata: Metadata = {
  title: "Offdex Web UI",
  description: "Use your live Codex session from the browser.",
};

export default function WebUiPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/90 shadow-border backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="focus-ring group flex items-center gap-3 rounded-md">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground text-sm font-semibold text-background">
              O
            </span>
            <span>
              <span className="block text-sm font-semibold">Offdex</span>
              <span className="block text-xs text-muted-foreground">Codex web app</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground md:flex">
            Same bridge as mobile
          </div>
        </div>
      </header>
      <Suspense fallback={<div className="mx-auto max-w-7xl px-5 py-8 text-sm text-muted-foreground md:px-8">Loading Offdex web app...</div>}>
        <WebAppClient />
      </Suspense>
    </main>
  );
}
