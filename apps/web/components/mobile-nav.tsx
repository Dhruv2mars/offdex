"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex items-center justify-center p-2 text-muted-foreground hover:text-foreground focus-ring rounded-md"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="sr-only">Open main menu</span>
        {isOpen ? (
          <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-[56px] z-50 origin-top-right transform p-2 transition">
          <div className="overflow-hidden rounded-lg bg-background shadow-card border border-[#ebebeb]">
            <div className="space-y-1 px-4 pb-4 pt-4">
              <Link
                href="/changelog"
                className="block rounded-md px-3 py-2 text-[15px] font-medium text-muted-foreground hover:bg-[#fafafa] hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                Changelog
              </Link>
              <Link
                href="/docs"
                className="block rounded-md px-3 py-2 text-[15px] font-medium text-muted-foreground hover:bg-[#fafafa] hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                Documentation
              </Link>
              <Link
                href="/download"
                className="block rounded-md px-3 py-2 text-[15px] font-medium text-muted-foreground hover:bg-[#fafafa] hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                Download
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
