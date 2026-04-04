"use client";

import { useState } from "react";

interface InstallCommandProps {
  command: string;
}

export function InstallCommand({ command }: InstallCommandProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/30 p-4 animate-fade-in-delay-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Install bridge CLI
        </span>
        <span
          aria-live="polite"
          className="text-[11px] text-muted-foreground"
        >
          {copied ? "Copied" : ""}
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
        <span className="select-none text-muted-foreground">$</span>
        <code className="flex-1 font-mono text-sm">{command}</code>
        <button
          aria-label="Copy install command"
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={handleCopy}
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
