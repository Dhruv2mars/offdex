import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubRepoUrl,
  githubReleasesUrl,
} from "../site-content";
import { TerminalBlock } from "../../components/terminal-block";

export default function DownloadPage() {
  return (
    <main className="flex-1 pb-32">
      {/* Header aligned exactly with Changelog and Docs */}
      <section className="mx-auto w-full max-w-[1000px] px-6 pt-24 pb-16 md:px-8 md:pt-32">
        <div className="max-w-[600px]">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
            Download
          </h1>
          <p className="mt-6 text-[18px] leading-[1.6] text-muted-foreground">
            Install the bridge CLI on your Mac, then get the mobile app to control Codex from anywhere.
          </p>
        </div>
      </section>

      {/* Grid aligned exactly with Changelog and Docs */}
      <section className="mx-auto w-full max-w-[1000px] px-6 md:px-8">
        <div className="grid gap-12 md:grid-cols-[180px_1fr] md:gap-12">
          
          {/* Sidebar Navigation */}
          <aside className="hidden pt-[6px] md:block">
            <div className="sticky top-24 pr-8">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Platforms
              </h3>
              <nav className="mt-6 flex flex-col gap-3 border-l border-[#ebebeb]">
                <a href="#bridge-cli" className="group flex items-center gap-3 pl-4 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
                  <span className="-ml-3 transition-transform group-hover:translate-x-2">Bridge CLI</span>
                </a>
                <a href="#android-apk" className="group flex items-center gap-3 pl-4 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
                  <span className="-ml-3 transition-transform group-hover:translate-x-2">Android APK</span>
                </a>
                <a href="#ios-beta" className="group flex items-center gap-3 pl-4 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
                  <span className="-ml-3 transition-transform group-hover:translate-x-2">iOS Beta</span>
                </a>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="min-w-0 md:pl-0">
            
            {/* Bridge CLI */}
            <section id="bridge-cli" className="mb-16 last:mb-0 md:mb-24 scroll-mt-32">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="flex items-center rounded-full px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-[#0a72ef] bg-[#ebf5ff] shadow-border">
                  macOS / Linux / Windows
                </span>
                <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">
                  Bridge CLI
                </h2>
              </div>
              
              <p className="max-w-2xl text-[16px] leading-[1.6] text-muted-foreground">
                The global npm package is the public entrypoint. It downloads the matching native bridge runtime from GitHub Releases for your platform.
              </p>

              <div className="mt-8">
                <TerminalBlock command={`${cliInstallCommand} && ${bridgeStartCommand}`} />
              </div>
              
              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-foreground transition-colors hover:text-muted-foreground focus-ring rounded-sm"
              >
                View GitHub Releases &rarr;
              </a>
            </section>

            {/* Android APK */}
            <section id="android-apk" className="mb-16 last:mb-0 md:mb-24 scroll-mt-32">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="flex items-center rounded-full px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-[#de1d8d] bg-[#fff0f7] shadow-border">
                  Android
                </span>
                <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">
                  Android APK
                </h2>
              </div>
              
              <p className="max-w-2xl text-[16px] leading-[1.6] text-muted-foreground">
                Pull the latest signed Android build directly from GitHub Releases. Once installed, simply scan the QR code from the Bridge CLI to pair.
              </p>

              <a
                href={androidApkDownloadUrl}
                className="group/card mt-8 flex h-[120px] flex-col items-center justify-center rounded-[12px] bg-background shadow-border transition-shadow hover:shadow-card focus-ring"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#de1d8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 transition-transform group-hover/card:-translate-y-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="font-medium text-foreground">Download latest APK</span>
              </a>
            </section>

            {/* iOS Beta */}
            <section id="ios-beta" className="mb-16 last:mb-0 md:mb-24 scroll-mt-32">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="flex items-center rounded-full px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-[#ff5b4f] bg-[#ffefe5] shadow-border">
                  iOS
                </span>
                <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">
                  iOS Beta
                </h2>
              </div>
              
              <p className="max-w-2xl text-[16px] leading-[1.6] text-muted-foreground">
                The native iOS app exists in the repo, but there is no public TestFlight link yet. You can build it locally from the source.
              </p>

              <a
                href={`${githubRepoUrl}/tree/main/apps/mobile`}
                target="_blank"
                rel="noopener noreferrer"
                className="group/card mt-8 flex h-[120px] flex-col items-center justify-center rounded-[12px] bg-background shadow-border transition-shadow hover:shadow-card focus-ring"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5b4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 transition-transform group-hover/card:-translate-y-1">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                <span className="font-medium text-foreground">View iOS source</span>
              </a>
            </section>

          </div>
        </div>
      </section>
    </main>
  );
}