"use client";

import { useState } from "react";

export function TerminalBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group mt-8 overflow-hidden rounded-[12px] bg-background shadow-border transition-shadow hover:shadow-card">
      <div className="relative flex h-10 items-center justify-between border-b border-[#ebebeb] bg-[#fafafa] px-4">
        <div className="flex gap-2">
          <div className="h-[10px] w-[10px] rounded-full bg-[#ff5f56]" />
          <div className="h-[10px] w-[10px] rounded-full bg-[#ffbd2e]" />
          <div className="h-[10px] w-[10px] rounded-full bg-[#27c93f]" />
        </div>
        <button
          onClick={handleCopy}
          className="absolute right-2 opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground focus-ring rounded-md px-2 py-1 bg-[#ebebeb]/50 hover:bg-[#ebebeb]"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#27c93f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span className="text-[#27c93f]">Copied</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="p-5 font-mono text-[13px] leading-[1.8] text-foreground overflow-x-auto">
        <span className="text-muted-foreground mr-3">$</span>
        {command}
      </div>
    </div>
  );
}
