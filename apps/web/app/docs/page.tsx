import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubReleasesUrl,
  webAppUrl,
} from "../site-content";

const docsSections = [
  {
    id: "install-bridge",
    step: "01",
    title: "Install the bridge",
    body:
      "Install the Offdex CLI globally. The npm package downloads the matching native bridge runtime for the machine that actually owns Codex.",
    command: cliInstallCommand,
    accent: "text-[#0a72ef]",
    bg: "bg-[#ebf5ff]",
    points: [
      "macOS, Linux, and Windows binaries ship from GitHub Releases.",
      "The CLI is the public install path for starting a real bridge.",
    ],
  },
  {
    id: "start-bridge",
    step: "02",
    title: "Start your local bridge",
    body:
      "Boot the local runtime on your Mac and keep it authenticated. Offdex clients connect to this bridge instead of carrying Codex state themselves.",
    command: bridgeStartCommand,
    accent: "text-[#de1d8d]",
    bg: "bg-[#fff0f7]",
    points: [
      "The QR and web pairing entrypoints are exposed from the bridge session.",
      "Remote pairing falls back to the encrypted relay when local access disappears.",
    ],
  },
  {
    id: "pair-client",
    step: "03",
    title: "Pair from phone or web",
    body:
      "Open the mobile app or the web client, scan or follow the pairing link, and trust the client once. After that, the bridge handles reconnection.",
    command: "Open /webui or the mobile app and pair once",
    accent: "text-[#ff5b4f]",
    bg: "bg-[#ffefe5]",
    points: [
      "Clients try the local bridge first.",
      "Trusted sessions stay disposable because the bridge remains the authority.",
    ],
  },
  {
    id: "session-model",
    step: "04",
    title: "Mac owns the session",
    body:
      "Offdex is designed so the bridge owns authentication, context, and command execution. Phone and web surfaces are just controlled windows into that same runtime.",
    command: "Bridge authority stays local",
    accent: "text-foreground",
    bg: "bg-[#fafafa]",
    points: [
      "Clear a client safely without breaking the machine state.",
      "Use the same session from home, from the browser, or on the move.",
    ],
  },
];

const quickLinks = [
  {
    title: "CLI install",
    href: githubReleasesUrl,
    label: "Release binaries",
  },
  {
    title: "Android app",
    href: androidApkDownloadUrl,
    label: "Latest APK",
  },
  {
    title: "Web client",
    href: webAppUrl,
    label: "Open WebUI",
  },
];

export default function DocsPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-[1200px] px-6 py-16 md:px-8 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[20px] bg-[#fafafa] p-5 shadow-card">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Navigation
              </p>
              <nav className="mt-5 space-y-2">
                {docsSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-[10px] px-3 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-ring"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-[24px] bg-background p-1">
              <span className="rounded-full bg-[#fafafa] px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-border">
                Documentation
              </span>
              <h1 className="mt-8 text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[64px] md:tracking-[-2.56px]">
                Get started fast
              </h1>
              <p className="mt-6 max-w-3xl text-[18px] leading-[1.7] text-muted-foreground">
                Mintlify-style structure, but with the same Offdex shell: dense
                navigation, quick cards, and direct operating guidance for the
                bridge, pairing flow, and local-first routing.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {quickLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className="rounded-[18px] bg-[#fafafa] p-5 shadow-card transition-shadow hover:shadow-card-hover focus-ring"
                >
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    Quick link
                  </p>
                  <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.8px] text-foreground">
                    {link.title}
                  </h2>
                  <p className="mt-2 text-[14px] text-muted-foreground">
                    {link.label}
                  </p>
                </a>
              ))}
            </div>

            <div className="mt-10 space-y-6">
              {docsSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 rounded-[22px] bg-background p-6 shadow-card md:p-8"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-4">
                        <span
                          className={`flex h-[30px] items-center rounded-full px-3 font-mono text-[12px] font-semibold ${section.bg} ${section.accent}`}
                        >
                          {section.step}
                        </span>
                        <h2 className="text-[28px] font-semibold tracking-[-1.12px] text-foreground">
                          {section.title}
                        </h2>
                      </div>
                      <p className="mt-5 text-[16px] leading-[1.7] text-muted-foreground">
                        {section.body}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-[16px] bg-[#fafafa] p-4 shadow-border md:w-[320px]">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        Command flow
                      </p>
                      <code className="mt-4 block overflow-x-auto text-[14px] leading-[1.7] text-foreground">
                        {section.command}
                      </code>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {section.points.map((point) => (
                      <div
                        key={point}
                        className="rounded-[14px] bg-[#fafafa] px-4 py-4 text-[14px] leading-[1.65] text-muted-foreground shadow-border"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-[20px] bg-[#fafafa] p-5 shadow-card">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Fast path
                </p>
                <ol className="mt-5 space-y-3 text-[14px] leading-[1.7] text-muted-foreground">
                  <li>1. Install the bridge on the machine that runs Codex.</li>
                  <li>2. Start the bridge and keep that session authenticated.</li>
                  <li>3. Pair once from mobile or web, then reconnect as needed.</li>
                </ol>
              </div>
              <div className="rounded-[20px] bg-[#fafafa] p-5 shadow-card">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Product surfaces
                </p>
                <div className="mt-5 space-y-3">
                  <a
                    href={webAppUrl}
                    className="block rounded-[12px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
                  >
                    Open WebUI
                  </a>
                  <Link
                    href="/download"
                    className="block rounded-[12px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
                  >
                    Download clients
                  </Link>
                  <Link
                    href="/changelog"
                    className="block rounded-[12px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
                  >
                    Read release notes
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
