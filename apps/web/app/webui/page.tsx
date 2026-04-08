import type { Metadata } from "next";
import { Suspense } from "react";
import { WebAppClient } from "./web-app-client";

export const metadata: Metadata = {
  title: "Offdex Web UI",
  description: "Use your live Codex session from the browser.",
};

export default function WebUiPage() {
  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <Suspense fallback={<div className="grid h-dvh place-items-center text-sm text-muted-foreground">Loading Offdex web app...</div>}>
        <WebAppClient />
      </Suspense>
    </main>
  );
}
