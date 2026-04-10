import Image from "next/image";
import { githubReleasesUrl } from "../app/site-content";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#ebebeb] bg-[#fafafa] mt-auto flex h-14 items-center">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 md:px-8">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Offdex Logo" width={20} height={20} className="h-5 w-auto rounded-md grayscale" />
          <span className="hidden sm:inline text-[14px] font-medium text-foreground">Offdex. Codex for mobile.</span>
          <span className="sm:hidden text-[14px] font-medium text-foreground">Offdex</span>
        </div>
        <div className="flex items-center text-[14px] font-medium text-muted-foreground">
          <a href={githubReleasesUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
            GitHub
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
