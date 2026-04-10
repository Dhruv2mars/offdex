import Link from "next/link";
import {
  androidApkDownloadUrl,
  githubReleasesUrl,
} from "./site-content";
import { HeroBackground } from "../components/hero-background";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative mx-auto w-full max-w-[1200px] overflow-hidden px-6 pt-24 pb-20 text-center md:px-8 md:pt-32 md:pb-24">
        {/* Animated & Interactive Background */}
        <HeroBackground />

        <div className="animate-fade-in relative z-10 mx-auto max-w-[900px]">
          <h1 className="text-[56px] font-semibold leading-[1.05] tracking-[-2.4px] md:text-[76px] md:tracking-[-2.88px] lg:text-[88px]">
            The Codex <br className="hidden md:block" /> Mobile App.
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-[1.6] text-muted-foreground md:text-[20px]">
            A remote control for your local Codex runtime. Keep Codex working on your Mac, and control it from anywhere.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href={githubReleasesUrl}
              className="rounded-[6px] bg-foreground px-6 py-[12px] text-[15px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
            >
              Install CLI
            </a>
            <a
              href={androidApkDownloadUrl}
              className="rounded-[6px] bg-background px-6 py-[12px] text-[15px] font-medium text-foreground shadow-border transition-colors hover:bg-[#fafafa] focus-ring"
            >
              Install Mobile App
            </a>
          </div>
        </div>

        {/* Visual / Art Component */}
        <div className="animate-fade-in-delay relative z-20 mx-auto mt-16 w-full max-w-[1000px] h-[420px] md:mt-24 md:h-[540px] pointer-events-none select-none [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]">
          
          {/* Mac Terminal Window */}
          <div className="absolute left-1/2 top-0 z-10 w-[95%] max-w-[760px] -translate-x-1/2 overflow-hidden rounded-[16px] bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_40px_80px_-20px_rgba(0,0,0,0.15)] text-left">
            <div className="flex h-12 items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-5">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
              </div>
            </div>
            <div className="p-5 md:p-6 font-mono text-[14px] leading-[1.8] h-[340px] md:h-[460px]">
              <p className="text-foreground flex items-center gap-[1ch]">
                <span>$</span>
                <span className="inline-flex h-[1.4em] overflow-hidden">
                  <span className="animate-pkg-scroll flex flex-col">
                    <span className="flex h-[1.4em] items-center">npm</span>
                    <span className="flex h-[1.4em] items-center">bun</span>
                    <span className="flex h-[1.4em] items-center">pnpm</span>
                    <span className="flex h-[1.4em] items-center">npm</span>
                  </span>
                </span>
                <span>install -g @dhruv2mars/offdex</span>
              </p>
              <p className="mt-4 text-foreground">$ offdex start</p>
              <p className="mt-4 text-foreground">Bridge started on port 42420</p>
              <p className="text-[#0a72ef]">Waiting for client connection...</p>
              <p className="mt-4 text-[#27c93f]">✓ Client connected: Mobile App (iOS)</p>
              <p className="text-muted-foreground">Synchronizing local context tree...</p>
              <p className="text-muted-foreground">Establishing encrypted relay fallback tunnel...</p>
              <p className="text-[#27c93f]">✓ Tunnel active</p>
              <p className="mt-4 text-muted-foreground">Processing context snapshot...</p>
              <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                <span className="inline-block h-[16px] w-[10px] animate-blink bg-foreground" />
              </div>
            </div>
          </div>

          {/* Mobile Phone Mockup */}
          <div className="absolute top-[80px] left-1/2 z-20 w-[220px] ml-[40px] md:top-[100px] md:w-[260px] md:ml-[160px]">
            <div className="overflow-hidden rounded-[36px] bg-background p-[10px] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_40px_80px_-20px_rgba(0,0,0,0.2)]">
              <div className="relative h-[400px] md:h-[460px] w-full overflow-hidden rounded-[26px] bg-[#fafafa] shadow-border">
                {/* Notch */}
                <div className="absolute inset-x-0 -top-[1px] flex justify-center">
                  <div className="h-6 w-24 rounded-b-[14px] border-b border-x border-[#ebebeb] bg-background" />
                </div>
                
                {/* Phone Screen UI */}
                <div className="flex h-full flex-col p-4 md:p-5 pt-20 md:pt-24">
                  <div className="flex items-center justify-between rounded-[10px] bg-background p-3 shadow-border">
                    <div>
                      <p className="text-[12px] md:text-[13px] font-semibold text-foreground">Active Session</p>
                      <p className="mt-1 text-[10px] md:text-[11px] font-medium text-[#27c93f]">Bridge Connected</p>
                    </div>
                    <div className="grid h-6 w-6 md:h-7 md:w-7 place-items-center rounded-full bg-[#fafafa] shadow-border">
                      <div className="h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-[#27c93f]" />
                    </div>
                  </div>
                  
                  <div className="mt-auto space-y-3 md:space-y-4 pb-2 md:pb-4">
                     <div className="relative h-12 md:h-14 w-[85%] overflow-hidden rounded-[10px] bg-background shadow-border">
                        <div className="absolute inset-0 animate-pulse bg-[#0a72ef]/5" />
                     </div>
                     <div className="h-8 md:h-10 w-full rounded-[10px] bg-background shadow-border" />
                     <div className="h-8 md:h-10 w-[60%] rounded-[10px] bg-background shadow-border" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Workflow Pipeline */}
      <section className="mx-auto w-full max-w-[1200px] border-t border-[#ebebeb] px-6 py-24 md:px-8 md:py-32">
        <div className="grid gap-12 md:grid-cols-3 md:gap-8 lg:gap-12">
          
          {/* Step 1: Install */}
          <div className="relative group">
            <div className="mb-6 flex items-center gap-4">
              <span className="font-mono text-[12px] font-bold text-[#0a72ef]">01</span>
              <h3 className="text-[20px] font-semibold tracking-[-0.96px] text-foreground">Install Offdex CLI</h3>
              <div className="hidden h-[1px] flex-1 border-t border-dashed border-[#ebebeb] md:block" />
            </div>
            <p className="mb-8 text-[15px] leading-[1.6] text-muted-foreground">
              Get the Offdex CLI. The native bridge runs directly on your Mac, owning Codex authentication and executing commands securely.
            </p>
            <div className="flex h-[64px] items-center rounded-[8px] bg-[#fafafa] px-4 font-mono text-[13px] text-foreground shadow-border transition-colors hover:bg-[#f5f5f5]">
              <span className="select-none text-[#0a72ef]">$ </span>
              <span className="ml-2 flex items-center gap-[1ch]">
                <span className="inline-flex h-[1.4em] overflow-hidden text-[#0a72ef]">
                  <span className="animate-pkg-scroll flex flex-col">
                    <span className="flex h-[1.4em] items-center">npm</span>
                    <span className="flex h-[1.4em] items-center">bun</span>
                    <span className="flex h-[1.4em] items-center">pnpm</span>
                    <span className="flex h-[1.4em] items-center">npm</span>
                  </span>
                </span>
                <span>i -g @dhruv2mars/offdex</span>
              </span>
            </div>
          </div>

          {/* Step 2: Start */}
          <div className="relative group">
            <div className="mb-6 flex items-center gap-4">
              <span className="font-mono text-[12px] font-bold text-[#de1d8d]">02</span>
              <h3 className="text-[20px] font-semibold tracking-[-0.96px] text-foreground">Start Relay</h3>
              <div className="hidden h-[1px] flex-1 border-t border-dashed border-[#ebebeb] md:block" />
            </div>
            <p className="mb-8 text-[15px] leading-[1.6] text-muted-foreground">
              Initiate the local network bridge. Fallback instantly to the encrypted Cloudflare tunnel when leaving home.
            </p>
            <div className="flex h-[64px] items-center rounded-[8px] bg-[#fafafa] px-4 font-mono text-[13px] text-foreground shadow-border transition-colors hover:bg-[#f5f5f5]">
              <span className="select-none text-[#de1d8d]">$ </span>
              <span className="ml-2">offdex start</span>
            </div>
          </div>

          {/* Step 3: Pair */}
          <div className="relative group">
            <div className="mb-6 flex items-center gap-4">
              <span className="font-mono text-[12px] font-bold text-[#ff5b4f]">03</span>
              <h3 className="text-[20px] font-semibold tracking-[-0.96px] text-foreground">Pair Client</h3>
            </div>
            <p className="mb-8 text-[15px] leading-[1.6] text-muted-foreground">
              Scan the QR code to trust your mobile phone or web browser. Once trusted, re-connect automatically.
            </p>
            <div className="flex h-[64px] items-center gap-4 rounded-[8px] bg-[#fafafa] px-4 shadow-border transition-colors hover:bg-[#f5f5f5]">
              <div className="grid h-9 w-9 place-items-center rounded-[6px] bg-background shadow-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5b4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <path d="M3 14h7v7H3z" />
                </svg>
              </div>
              <span className="font-mono text-[13px] text-foreground">Securely paired</span>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Grid (Architecture) */}
      <section className="mx-auto w-full max-w-[1200px] border-t border-[#ebebeb] px-6 py-24 md:px-8 md:py-32">
        <div className="mb-16">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Architecture
          </span>
          <h2 className="mt-8 max-w-2xl text-[32px] font-semibold leading-[1.15] tracking-[-1.28px] md:text-[40px] md:tracking-[-2.4px]">
            Put authority in the bridge. Keep every client disposable.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1 */}
          <div className="rounded-[12px] bg-background p-8 shadow-card transition-shadow hover:shadow-card-hover">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#fafafa] shadow-border">
              <span className="font-mono text-[13px] font-bold text-foreground">01</span>
            </div>
            <h3 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">Mac as the Brain</h3>
            <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
              The bridge retains all state, context logic, and authentication records. Your mobile device performs no heavy computation, existing merely as a lens into the active session.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-[12px] bg-background p-8 shadow-card transition-shadow hover:shadow-card-hover">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#ebf5ff] shadow-border">
              <span className="font-mono text-[13px] font-bold text-[#0a72ef]">02</span>
            </div>
            <h3 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">Local-First Routing</h3>
            <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
              Mobile and web clients will attempt local bridging first. Remote traffic routes through an encrypted Cloudflare fallback only when offline, keeping your commands private.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-[12px] bg-background p-8 shadow-card transition-shadow hover:shadow-card-hover">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#fff0f7] shadow-border">
              <span className="font-mono text-[13px] font-bold text-[#de1d8d]">03</span>
            </div>
            <h3 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">Secure Pairing</h3>
            <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
              Cryptographic QR handshakes bind your clients to the Mac bridge. Random connections from internet clients are structurally impossible without the localized QR token.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-[12px] bg-background p-8 shadow-card transition-shadow hover:shadow-card-hover">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#ffefe5] shadow-border">
              <span className="font-mono text-[13px] font-bold text-[#ff5b4f]">04</span>
            </div>
            <h3 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">Disposable UI</h3>
            <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
              Clear app storage safely at any time. Pairing credentials can be re-issued instantly, and ongoing sessions resume seamlessly across all connected clients.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
