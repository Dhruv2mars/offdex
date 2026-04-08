import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubReleasesUrl,
  webAppUrl,
} from "./site-content";
import { InstallCommand } from "./install-command";

const commandMap = [
  ["01", "Mac bridge", "Owns Codex auth, threads, runtime state, and the live stream."],
  ["02", "Trusted clients", "Phone and browser connect as thin controls, not shadow runtimes."],
  ["03", "Relay fallback", "Local first nearby, encrypted relay only when the client is away."],
] as const;

const runModes = [
  ["Run", "Send the next turn to the Mac session already doing the work.", "text-develop"],
  ["Trust", "Pair once with QR, then reconnect through the trusted machine record.", "text-preview"],
  ["Control", "Switch runtime target, clear local trust, or open project support.", "text-ship"],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/90 shadow-border backdrop-blur">
        <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_auto] items-center px-5 md:px-8">
          <Link className="focus-ring flex w-fit items-center gap-3 rounded-md" href="/">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground text-sm font-semibold text-background">
              O
            </span>
            <span className="text-sm font-semibold">Offdex</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link className="focus-ring rounded-md hover:text-foreground" href={webAppUrl}>
              Open app
            </Link>
            <Link className="focus-ring rounded-md hover:text-foreground" href="/architecture">
              Signal path
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-5 px-5 py-6 md:grid-cols-[280px_minmax(0,1fr)] md:px-8">
        <aside className="hidden rounded-lg bg-card p-4 shadow-card md:block">
          <div className="rounded-md bg-foreground p-4 text-background">
            <p className="font-mono text-xs uppercase text-background/60">Offdex</p>
            <p className="mt-10 text-3xl font-semibold tracking-[-0.96px]">Run Codex from the closest screen.</p>
          </div>
          <div className="mt-4 space-y-2">
            {runModes.map(([title, body, color]) => (
              <div className="rounded-lg bg-background p-4 shadow-border" key={title}>
                <p className={`font-mono text-xs font-medium ${color}`}>{title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="grid content-start gap-5">
          <section className="rounded-lg bg-card p-5 shadow-card md:p-8">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                  Start from the bridge.
                </p>
                <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-none tracking-[-2.4px] md:text-6xl">
                  Codex stays on the Mac. Control moves with you.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  Offdex turns your phone and browser into trusted controls for the same live Codex session.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    className="focus-ring rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-[#333333]"
                    href={webAppUrl}
                  >
                    Open control
                  </Link>
                  <a
                    className="focus-ring rounded-md bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-border transition hover:bg-muted"
                    href={androidApkDownloadUrl}
                  >
                    Install Android
                  </a>
                  <a
                    className="focus-ring rounded-md bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-border transition hover:text-foreground"
                    href={githubReleasesUrl}
                  >
                    Releases
                  </a>
                </div>
              </div>

              <div className="rounded-lg bg-background p-4 shadow-border">
                <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                  Command map
                </p>
                <div className="mt-4 space-y-3">
                  {commandMap.map(([step, title, body]) => (
                    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-lg bg-card p-4 shadow-card" key={title}>
                      <span className="font-mono text-xs text-muted-foreground">{step}</span>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg bg-card p-5 shadow-card">
              <InstallCommand command={cliInstallCommand} />
              <p className="mt-4 rounded-md bg-muted px-4 py-3 font-mono text-sm text-muted-foreground shadow-border">
                $ {bridgeStartCommand}
              </p>
            </div>

            <div className="rounded-lg bg-card p-5 shadow-card">
              <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                Handoff state
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {["Mac", "Phone", "Web"].map((label, index) => (
                  <div className="rounded-md bg-background px-3 py-4 shadow-border" key={label}>
                    <p className="font-mono text-muted-foreground">0{index + 1}</p>
                    <p className="mt-2 font-semibold">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                One source of truth, multiple controls, no duplicated Codex runtime.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
