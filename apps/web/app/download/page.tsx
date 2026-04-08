import {
  androidApkDownloadUrl,
  cliInstallCommand,
  githubRepoUrl,
  githubReleasesUrl,
} from "../site-content";
import { TerminalBlock } from "../../components/terminal-block";

export default function DownloadPage() {
  return (
    <main className="flex-1 pb-32">
      {/* Modest Utilitarian Header */}
      <section className="mx-auto w-full max-w-[900px] px-6 pt-24 pb-12 md:px-8 md:pt-32">
        <h1 className="text-[32px] font-semibold tracking-[-1.2px] text-foreground md:text-[40px] md:tracking-[-1.6px]">
          Download Offdex
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
          Get the bridge for your host machine, and the client apps to connect.
        </p>
      </section>

      {/* Settings-Pane Style Rows */}
      <section className="mx-auto w-full max-w-[900px] px-6 md:px-8">
        <div className="border-t border-[#ebebeb]">
          
          {/* Row 1: CLI */}
          <div className="flex flex-col gap-6 border-b border-[#ebebeb] py-12 md:flex-row md:gap-12">
            <div className="w-full shrink-0 md:w-[220px]">
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                <h2 className="text-[18px] font-semibold tracking-[-0.64px] text-foreground">Bridge CLI</h2>
              </div>
              <p className="mt-2 text-[14px] text-muted-foreground">macOS, Linux, Windows</p>
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="mb-6 text-[15px] leading-[1.6] text-muted-foreground">
                The global npm package is the primary entrypoint. It automatically fetches the matching native runtime for your machine from GitHub Releases.
              </p>
              <div className="mb-6">
                <TerminalBlock command={cliInstallCommand} />
              </div>
              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[14px] font-medium text-foreground transition-colors hover:text-muted-foreground focus-ring rounded-sm"
              >
                View GitHub Releases &rarr;
              </a>
            </div>
          </div>

          {/* Row 2: Mobile Apps */}
          <div className="flex flex-col gap-6 border-b border-[#ebebeb] py-12 md:flex-row md:gap-12">
            <div className="w-full shrink-0 md:w-[220px]">
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <h2 className="text-[18px] font-semibold tracking-[-0.64px] text-foreground">Mobile Clients</h2>
              </div>
              <p className="mt-2 text-[14px] text-muted-foreground">Android, iOS</p>
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="mb-6 text-[15px] leading-[1.6] text-muted-foreground">
                Download the signed Android APK directly to your device, or build the iOS app from source. A public iOS TestFlight is coming soon.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={androidApkDownloadUrl}
                  className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[6px] bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Android APK
                </a>
                <a
                  href={`${githubRepoUrl}/tree/main/apps/mobile`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[6px] bg-background px-5 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-[#fafafa] focus-ring"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  iOS Source
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}