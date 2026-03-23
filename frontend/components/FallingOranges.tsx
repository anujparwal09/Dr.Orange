'use client';

import { useState, useEffect } from 'react';

const ORANGE_COUNT = 22;

function OrangeSVG() {
  return (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fo-grad" cx="38%" cy="32%">
          <stop offset="0%" stopColor="#FFD580" />
          <stop offset="40%" stopColor="#FF8C00" />
          <stop offset="80%" stopColor="#CC4400" />
          <stop offset="100%" stopColor="#8B2500" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="24" r="14" fill="url(#fo-grad)" />
      <path d="M20 10 C20 10 16 4 10 5.5 C14 7 17 10 20 10Z" fill="#2D7A3A" />
      <path d="M20 10 C20 10 25 3 32 5 C26 7 22 9.5 20 10Z" fill="#3D9A4A" />
      <ellipse cx="15" cy="19" rx="5" ry="3" fill="rgba(255,255,255,0.12)" transform="rotate(-20 15 19)" />
      <line x1="20" y1="10" x2="20" y2="6" stroke="#5A3E1B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

interface FallingOrange {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  fallAnim: string;
  swayAnim: string;
}

export default function FallingOranges() {
  const [oranges, setOranges] = useState<FallingOrange[]>([]);

  useEffect(() => {
    const arr: FallingOrange[] = [];
    const fallAnims = ['fall-1', 'fall-2', 'fall-3'];
    const swayAnims = ['fall-sway', 'fall-sway-rev'];

    for (let i = 0; i < ORANGE_COUNT; i++) {
      arr.push({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 24 + 18,
        duration: Math.random() * 12 + 10,
        delay: Math.random() * 18,
        opacity: Math.random() * 0.35 + 0.2,
        fallAnim: fallAnims[Math.floor(Math.random() * fallAnims.length)],
        swayAnim: swayAnims[Math.floor(Math.random() * swayAnims.length)],
      });
    }
    setOranges(arr);
  }, []);

  if (oranges.length === 0) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {oranges.map((o) => (
        <div
          key={o.id}
          style={{
            position: 'absolute',
            left: `${o.left}%`,
            top: '-40px',
            width: `${o.size}px`,
            height: `${o.size}px`,
            opacity: o.opacity,
            animation: `${o.fallAnim} ${o.duration}s linear ${o.delay}s infinite, ${o.swayAnim} ${o.duration * 0.6}s ease-in-out ${o.delay}s infinite`,
            filter: 'drop-shadow(0 0 8px rgba(255,140,0,0.4))',
          }}
        >
          <OrangeSVG />
        </div>
      ))}
    </div>
  );
}
