import { githubReleasesUrl } from "../app/site-content";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#ebebeb] bg-[#fafafa] py-8 mt-auto">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-6 px-6 md:flex-row md:px-8">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Offdex Logo" className="h-6 w-6 rounded-md grayscale" />
          <span className="text-[14px] font-medium text-foreground">Offdex. Codex for mobile.</span>
        </div>
        <div className="flex gap-8 text-[14px] font-medium text-muted-foreground">
          <a href={githubReleasesUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
