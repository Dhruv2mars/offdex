"use client";

import { useState } from "react";
import { TerminalBlock } from "./terminal-block";

export function PackageManagerTerminal() {
  const [manager, setManager] = useState<"npm" | "bun" | "pnpm">("npm");

  const getCommand = () => {
    switch (manager) {
      case "npm":
        return "npm install -g @dhruv2mars/offdex && offdex start";
      case "bun":
        return "bun add -g @dhruv2mars/offdex && offdex start";
      case "pnpm":
        return "pnpm add -g @dhruv2mars/offdex && offdex start";
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Segmented Control */}
      <div className="flex items-center gap-1 rounded-[8px] bg-[#fafafa] p-1 shadow-border w-fit">
        {(["npm", "bun", "pnpm"] as const).map((mgr) => (
          <button
            key={mgr}
            onClick={() => setManager(mgr)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ${
              manager === mgr
                ? "bg-background text-foreground shadow-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mgr}
          </button>
        ))}
      </div>

      {/* Terminal */}
      <TerminalBlock command={getCommand()} />
    </div>
  );
}
