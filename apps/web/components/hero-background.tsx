'use client';

import { useEffect, useRef } from 'react';

export function HeroBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let initialized = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      if (!initialized) {
        currentX = targetX;
        currentY = targetY;
        initialized = true;
      }
    };

    const animate = () => {
      if (initialized && ref.current) {
        // Fluid water-like lerp (0.04 is a very smooth trailing factor)
        currentX += (targetX - currentX) * 0.04;
        currentY += (targetY - currentY) * 0.04;
        
        ref.current.style.setProperty('--mouse-x', `${currentX}px`);
        ref.current.style.setProperty('--mouse-y', `${currentY}px`);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    // Initial position if mouse hasn't moved yet
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      targetX = rect.width / 2;
      targetY = -200; // start slightly above
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div 
      ref={ref} 
      className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none [mask-image:radial-gradient(100%_100%_at_50%_0%,black_0%,transparent_70%)] [-webkit-mask-image:radial-gradient(100%_100%_at_50%_0%,black_0%,transparent_70%)]"
    >
      {/* 1. The subtle dotted/lined grid to break up the empty white void */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* 2. Interactive Spotlight that follows the mouse (combining the brand colors, very subtle) */}
      <div 
        // Fixed: Removed CSS transition because JS lerping provides the fluid, water-like motion
        className="absolute inset-0"
        style={{
          background: `radial-gradient(1200px circle at var(--mouse-x) var(--mouse-y), rgba(10,114,239,0.06) 0%, rgba(222,29,141,0.04) 40%, rgba(255,91,79,0.02) 70%, transparent 100%)`
        }}
      />

      {/* 3. Static ambient glow just in case they are on mobile or haven't moved the mouse */}
      <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#ff5b4f]/5 via-[#de1d8d]/3 to-[#0a72ef]/5 blur-[120px] opacity-50" />
    </div>
  );
}
