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
  ["Install", cliInstallCommand],
  ["Start", bridgeStartCommand],
  ["Use", "Open mobile or web, then send a turn"],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(16,163,127,0.2),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(202,255,227,0.09),transparent_24%),linear-gradient(150deg,#070807,#101711_50%,#070807)]" />
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-12 px-5 py-6 md:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] md:px-8">
        <div className="flex flex-col">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-brand">
                O
              </span>
              <span>
                <span className="block text-sm font-semibold">Offdex</span>
                <span className="block text-xs text-muted-foreground">Codex mobile app</span>
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link className="transition hover:text-foreground" href={webAppUrl}>
                Web app
              </Link>
              <Link className="transition hover:text-foreground" href="/architecture">
                Architecture
              </Link>
            </nav>
          </header>

          <div className="flex flex-1 flex-col justify-center py-16">
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-xs text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Mobile and web surfaces for the same Codex session
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.96] tracking-[-0.075em] text-[#f5f7f3] md:text-7xl">
              Codex, wherever your hands are.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
              Offdex turns your Mac into the live Codex runtime and gives you two first-class
              clients: the phone app and a browser UI. Same bridge. Same threads. Same truth.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-black transition hover:bg-brand-soft"
                href={webAppUrl}
              >
                Open web app
              </Link>
              <a
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold transition hover:border-brand/40"
                href={androidApkDownloadUrl}
              >
                Download Android
              </a>
              <a
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                href={githubReleasesUrl}
              >
                GitHub releases
              </a>
            </div>

            <div className="mt-8 max-w-2xl">
              <InstallCommand command={cliInstallCommand} />
            </div>
          </div>
        </div>

        <div className="relative flex items-center py-12">
          <div className="animate-float-slow relative w-full rounded-[2.2rem] border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#f7f8f5] text-[#111412]">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-[#68716b]">Offdex Web</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Live Codex thread</h2>
                </div>
                <span className="rounded-full bg-[#dff7ec] px-3 py-1 text-xs font-medium text-[#08775c]">
                  Live
                </span>
              </div>
              <div className="grid min-h-[520px] md:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="border-r border-black/10 bg-[#eef1ed] p-4">
                  {["New feature plan", "Fix bridge reconnect", "Review session sync"].map((item, index) => (
                    <div
                      className={`mb-2 rounded-2xl border px-3 py-3 ${
                        index === 0 ? "border-[#10a37f]/40 bg-white" : "border-black/5 bg-white/60"
                      }`}
                      key={item}
                    >
                      <p className="truncate text-sm font-semibold">{item}</p>
                      <p className="mt-1 text-xs text-[#68716b]">offdex · {index === 0 ? "running" : "ready"}</p>
                    </div>
                  ))}
                </aside>
                <section className="relative flex flex-col">
                  <div className="animate-scan-line pointer-events-none absolute left-0 right-0 top-0 h-24 bg-gradient-to-b from-[#10a37f]/0 via-[#10a37f]/10 to-[#10a37f]/0" />
                  <div className="flex-1 space-y-4 p-5">
                    <div className="max-w-[78%] rounded-[1.35rem] border border-black/10 bg-white px-5 py-4 shadow-sm">
                      <p className="text-xs text-[#68716b]">Codex</p>
                      <p className="mt-2 text-sm leading-6">I found the stale reconnect path. I will patch the controller and add a device resume check.</p>
                    </div>
                    <div className="ml-auto max-w-[78%] rounded-[1.35rem] bg-[#111412] px-5 py-4 text-white">
                      <p className="text-xs text-white/55">You</p>
                      <p className="mt-2 text-sm leading-6">Make it feel instant on mobile and web.</p>
                    </div>
                    <div className="max-w-[78%] rounded-[1.35rem] border border-black/10 bg-white px-5 py-4 shadow-sm">
                      <p className="text-xs text-[#68716b]">Codex</p>
                      <p className="mt-2 text-sm leading-6">Done. The bridge now refreshes before reconnecting and preserves the selected thread.</p>
                    </div>
                  </div>
                  <div className="border-t border-black/10 bg-white/80 p-4">
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[#68716b]">
                      Ask Codex to edit, explain, test, or ship...
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-20 md:grid-cols-3 md:px-8">
        {productPillars.map(([title, description]) => (
          <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-6" key={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-graphite/80 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Workflow</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {workflow.map(([label, value], index) => (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-5" key={label}>
                <span className="text-xs text-brand">0{index + 1}</span>
                <h3 className="mt-3 text-base font-semibold">{label}</h3>
                <p className="mt-2 font-mono text-xs leading-6 text-muted-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
