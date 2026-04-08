import {
  androidApkDownloadUrl,
  cliInstallCommand,
  githubRepoUrl,
} from "../site-content";
import { TerminalBlock } from "../../components/terminal-block";

export default function DownloadPage() {
  return (
    <main className="flex-1 pb-32">
      {/* Hero Section */}
      <section className="relative mx-auto w-full max-w-[1200px] overflow-hidden px-6 pt-24 pb-12 text-center md:px-8 md:pt-32">
        <div className="animate-fade-in relative z-10 mx-auto max-w-[900px]">
          <h1 className="text-[56px] font-semibold leading-[1.05] tracking-[-2.4px] md:text-[76px] md:tracking-[-2.88px] lg:text-[88px]">
            Download <br className="hidden md:block" /> Offdex.
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-[1.6] text-muted-foreground md:text-[20px]">
            Install the CLI on your host machine, then get the mobile app to connect from anywhere.
          </p>
        </div>
      </section>

      {/* Download Actions */}
      <section className="mx-auto w-full max-w-[800px] px-6 md:px-8">
        <div className="animate-fade-in-delay relative z-10 flex flex-col items-center">
          
          {/* 1. Bridge CLI */}
          <div className="w-full max-w-[640px] mb-16 md:mb-24">
            <div className="mb-6 flex items-center justify-center gap-3">
              <span className="flex items-center rounded-full px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-[#0a72ef] bg-[#ebf5ff] shadow-border">
                macOS / Linux / Windows
              </span>
            </div>
            <TerminalBlock command={cliInstallCommand} />
          </div>

          {/* 2. Mobile Apps */}
          <div className="w-full max-w-[640px] border-t border-[#ebebeb] pt-16 md:pt-24 text-center">
            <div className="mb-8 flex items-center justify-center gap-3">
              <span className="flex items-center rounded-full px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-[#fafafa] shadow-border">
                Mobile Clients
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={androidApkDownloadUrl}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[6px] bg-foreground px-8 py-[14px] text-[15px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Android APK
              </a>
              
              <a
                href={`${githubRepoUrl}/tree/main/apps/mobile`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[6px] bg-background px-8 py-[14px] text-[15px] font-medium text-foreground shadow-border transition-colors hover:bg-[#fafafa] focus-ring"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                View iOS Source
              </a>
            </div>
            <p className="mt-8 text-[14px] text-muted-foreground">
              The native iOS app exists in the repo. Public TestFlight coming soon.
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}