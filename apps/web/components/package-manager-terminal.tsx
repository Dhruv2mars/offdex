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
    <TerminalBlock 
      command={getCommand()} 
      headerContent={
        <div className="flex items-center gap-3">
          {(["npm", "bun", "pnpm"] as const).map((mgr) => (
            <button
              key={mgr}
              onClick={() => setManager(mgr)}
              className={`text-[12px] font-mono uppercase tracking-wider transition-colors focus-ring rounded-sm ${
                manager === mgr
                  ? "font-bold text-foreground"
                  : "font-medium text-muted-foreground hover:text-foreground"
              }`}
            >
              {mgr}
            </button>
          ))}
        </div>
      }
    />
  );
}
