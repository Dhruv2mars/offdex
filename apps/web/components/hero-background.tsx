'use client';

import { useEffect, useRef } from 'react';

export function HeroBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      // Use clientX/Y to track mouse position across the screen
      ref.current.style.setProperty('--mouse-x', `${e.clientX}px`);
      ref.current.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    // Set initial position off-screen so it glides in, or top center
    if (ref.current) {
      ref.current.style.setProperty('--mouse-x', `50vw`);
      ref.current.style.setProperty('--mouse-y', `-200px`);
    }

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      {/* 1. The subtle dotted/lined grid to break up the empty white void */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* 2. Interactive Spotlight that follows the mouse (combining the brand colors) */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(700px circle at var(--mouse-x) var(--mouse-y), rgba(10,114,239,0.06) 0%, rgba(222,29,141,0.04) 25%, rgba(255,91,79,0.02) 50%, transparent 100%)`
        }}
      />

      {/* 3. Static ambient glow just in case they are on mobile or haven't moved the mouse */}
      <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#ff5b4f]/10 via-[#de1d8d]/5 to-[#0a72ef]/10 blur-[120px] opacity-70" />
    </div>
  );
}
