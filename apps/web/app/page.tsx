import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubReleasesUrl,
  webAppUrl,
} from "./site-content";
import { InstallCommand } from "./install-command";

const productPillars = [
  ["Live truth", "Threads, turns, and running state stream from the Mac bridge."],
  ["Pair once", "Scan a QR, trust the machine, then reconnect without ceremony."],
  ["Local runtime", "Codex auth and execution stay on the computer already running Codex."],
] as const;

const workflow = [
  ["Develop", "Run Codex on the Mac already trusted by your account.", "text-develop"],
  ["Preview", "Pair the phone or browser once and keep the live session in view.", "text-preview"],
  ["Ship", "Send the next turn from wherever you are, without moving the runtime.", "text-ship"],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/90 shadow-border backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
          <Link className="focus-ring flex items-center gap-3 rounded-md" href="/">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground text-sm font-semibold text-background">
              O
            </span>
            <span className="text-sm font-semibold">Offdex</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link className="focus-ring rounded-md hover:text-foreground" href={webAppUrl}>
              Web app
            </Link>
            <Link className="focus-ring rounded-md hover:text-foreground" href="/architecture">
              Architecture
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col items-center px-5 py-16 text-center md:px-8 md:py-24">
        <div className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
          Mobile and web for the same Codex session
        </div>
        <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-none tracking-[-2.4px] text-foreground md:text-6xl">
          Codex, wherever your hands are.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl md:leading-9">
          Offdex keeps Codex running on your Mac and gives you a phone app and browser client for the same live threads.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            className="focus-ring rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-[#333333]"
            href={webAppUrl}
          >
            Open web app
          </Link>
          <a
            className="focus-ring rounded-md bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-border transition hover:bg-muted"
            href={androidApkDownloadUrl}
          >
            Download Android
          </a>
          <a
            className="focus-ring rounded-md bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-border transition hover:text-foreground"
            href={githubReleasesUrl}
          >
            GitHub releases
          </a>
        </div>

        <div className="mt-8 w-full max-w-2xl">
          <InstallCommand command={cliInstallCommand} />
        </div>

        <div className="mt-12 w-full max-w-5xl rounded-xl bg-card p-2 text-left shadow-card">
          <div className="overflow-hidden rounded-lg bg-background shadow-border">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-mono text-xs font-medium uppercase text-muted-foreground">
                  Offdex Web
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.96px]">
                  Live Codex thread
                </h2>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                Live
              </span>
            </div>
            <div className="grid min-h-[420px] shadow-border md:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="bg-muted p-4">
                {["New feature plan", "Fix bridge reconnect", "Review session sync"].map((item, index) => (
                  <div
                    className={`mb-2 rounded-lg bg-background px-3 py-3 shadow-border ${
                      index === 0 ? "shadow-card" : ""
                    }`}
                    key={item}
                  >
                    <p className="truncate text-sm font-semibold">{item}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      offdex · {index === 0 ? "running" : "ready"}
                    </p>
                  </div>
                ))}
              </aside>
              <section className="flex flex-col bg-background">
                <div className="flex-1 space-y-4 p-5">
                  <div className="max-w-[78%] rounded-lg bg-background px-5 py-4 shadow-card">
                    <p className="text-xs text-muted-foreground">Codex</p>
                    <p className="mt-2 text-sm leading-6">
                      I found the stale reconnect path. I will patch the controller and add a device resume check.
                    </p>
                  </div>
                  <div className="ml-auto max-w-[78%] rounded-lg bg-foreground px-5 py-4 text-background">
                    <p className="text-xs text-background/60">You</p>
                    <p className="mt-2 text-sm leading-6">Make it feel instant on mobile and web.</p>
                  </div>
                  <div className="max-w-[78%] rounded-lg bg-background px-5 py-4 shadow-card">
                    <p className="text-xs text-muted-foreground">Codex</p>
                    <p className="mt-2 text-sm leading-6">
                      Done. The bridge now refreshes before reconnecting and preserves the selected thread.
                    </p>
                  </div>
                </div>
                <div className="bg-background p-4 shadow-border">
                  <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground shadow-border">
                    Ask Codex to edit, explain, test, or ship...
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-16 md:grid-cols-3 md:px-8">
        {productPillars.map(([title, description]) => (
          <article className="rounded-lg bg-card p-6 shadow-card" key={title}>
            <h2 className="text-2xl font-semibold tracking-[-0.96px]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="rounded-lg bg-card p-6 shadow-card md:p-8">
          <p className="font-mono text-xs font-medium uppercase text-muted-foreground">Workflow</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {workflow.map(([label, value, color], index) => (
              <div className="rounded-lg bg-background p-5 shadow-border" key={label}>
                <span className={`font-mono text-xs font-medium ${color}`}>0{index + 1}</span>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.96px]">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-sm text-muted-foreground">$ {bridgeStartCommand}</p>
        </div>
      </section>
    </main>
  );
}
