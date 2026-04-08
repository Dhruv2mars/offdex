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
    id: "install-cli",
    step: "01",
    title: "Install the Offdex CLI",
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
      {/* Header aligned exactly with Changelog */}
      <section className="mx-auto w-full max-w-[1000px] px-6 pt-24 pb-16 md:px-8 md:pt-32">
        <div className="max-w-[600px]">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
            Documentation
          </h1>
          <p className="mt-6 text-[18px] leading-[1.6] text-muted-foreground">
            Learn how to install the Offdex CLI, start your local network tunnel, and securely pair your disposable clients.
          </p>
        </div>
      </section>

      {/* Grid aligned exactly with Changelog */}
      <section className="mx-auto w-full max-w-[1000px] px-6 md:px-8">
        <div className="grid gap-12 md:grid-cols-[180px_1fr] md:gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="hidden pt-[6px] md:block">
            <div className="sticky top-24 pr-8">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Start
              </h3>
              <nav className="mt-6 flex flex-col gap-3 border-l border-[#ebebeb]">
                {docsSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="group flex items-center gap-3 pl-4 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
                    <span className="-ml-3 transition-transform group-hover:translate-x-2">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="min-w-0 md:pl-0">
            {docsSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="mb-16 last:mb-0 md:mb-24 scroll-mt-32"
              >
                <div className="mb-6 flex flex-col gap-2">
                  <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${section.accent}`}>
                    Step {section.step}
                  </span>
                  <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">
                    {section.title}
                  </h2>
                </div>
                
                <p className="max-w-2xl text-[16px] leading-[1.6] text-muted-foreground">
                  {section.body}
                </p>

                <div className="mt-8">
                  <TerminalBlock command={section.command} />
                </div>

                <ul className="mt-8 space-y-1.5">
                  {section.points.map((point) => (
                    <li key={point} className="relative pl-4 text-[15px] leading-[1.6] text-muted-foreground before:absolute before:left-0 before:top-[0.6em] before:h-[4px] before:w-[4px] before:rounded-full before:bg-[#cccccc]">
                      {point}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
