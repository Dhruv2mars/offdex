import Link from "next/link";
import { architecturePrinciples } from "../site-content";

const signalPath = [
  ["Bridge", "The Mac owns Codex auth, session state, and live thread truth."],
  ["Client", "Mobile and web send intent and render snapshots from the bridge."],
  ["Trust", "QR pairing creates a device record before remote access is allowed."],
  ["Relay", "Encrypted remote traffic only carries opaque bridge messages."],
] as const;

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/90 shadow-border backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="focus-ring rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back home
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center rounded bg-foreground text-xs font-semibold text-background">
              O
            </span>
            <span className="text-xs font-medium text-muted-foreground">Offdex</span>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
        <div className="rounded-lg bg-card p-6 shadow-card md:p-8">
          <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
            Signal path
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-[-2.4px] md:text-6xl">
            Put authority in the bridge. Keep every client disposable.
          </h1>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {signalPath.map(([title, body], index) => (
              <article className="rounded-lg bg-background p-4 shadow-border" key={title}>
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                <h2 className="mt-10 text-2xl font-semibold tracking-[-0.96px]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-lg bg-foreground p-5 text-background">
            <p className="font-mono text-xs uppercase text-background/60">Rule</p>
            <p className="mt-20 text-3xl font-semibold tracking-[-0.96px]">
              Nothing runs on the phone that should remain on the Mac.
            </p>
          </aside>

          <section className="rounded-lg bg-card p-5 shadow-card">
            <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
              Product rules
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {architecturePrinciples.map((rule) => (
                <div
                  className="rounded-md bg-background px-4 py-3 text-sm leading-6 text-muted-foreground shadow-border"
                  key={rule}
                >
                  {rule}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
