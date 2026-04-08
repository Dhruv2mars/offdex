import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubReleasesUrl,
  webAppUrl,
} from "../site-content";
import { TerminalBlock } from "../../components/terminal-block";

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
    command: "Pairing URL and QR are printed in the terminal",
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
    command: "No state is stored permanently on your mobile device",
    accent: "text-foreground",
    bg: "bg-[#fafafa]",
    points: [
      "Clear a client safely without breaking the machine state.",
      "Use the same session from home, from the browser, or on the move.",
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="flex-1 pb-32">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-16 md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-20">
          
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Quick Start
              </h3>
              <nav className="mt-6 flex flex-col gap-3 border-l border-[#ebebeb]">
                {docsSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="group flex items-center gap-3 pl-4 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
                    <span className="-ml-3 transition-transform group-hover:translate-x-2">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="min-w-0">
            <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
              Documentation
            </h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.65] text-muted-foreground">
              Learn how to install the bridge, start your local network tunnel, and securely pair your disposable clients.
            </p>

            <div className="mt-16 md:mt-24">
              {docsSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="mt-20 scroll-mt-32 first:mt-0"
                >
                  <div className="flex items-center gap-4">
                    <span className={`flex h-[28px] items-center rounded-full px-3 font-mono text-[12px] font-semibold ${section.bg} ${section.accent}`}>
                      {section.step}
                    </span>
                    <h2 className="text-[28px] font-semibold tracking-[-1.12px] text-foreground md:text-[32px] md:tracking-[-1.28px]">
                      {section.title}
                    </h2>
                  </div>
                  
                  <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-muted-foreground md:text-[18px]">
                    {section.body}
                  </p>

                  <TerminalBlock command={section.command} />

                  <ul className="mt-8 space-y-3">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-[15px] leading-[1.6] text-muted-foreground">
                        <svg className="mt-[4px] shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
