'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Loader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center flex-col gap-6"
          style={{ background: 'var(--bg)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div
              className="relative"
              style={{
                width: 72,
                height: 72,
                animation: 'loaderPulse 1.5s ease-in-out infinite',
              }}
            >
              {/* Spinning rings */}
              <div
                className="absolute rounded-full"
                style={{
                  inset: -8,
                  border: '2px dashed rgba(255,140,0,0.4)',
                  animation: 'spin 3s linear infinite',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  inset: -16,
                  border: '1px solid rgba(255,140,0,0.15)',
                  animation: 'spin 5s linear infinite reverse',
                }}
              />
              {/* Orange SVG */}
              <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="loader-og" cx="38%" cy="32%">
                    <stop offset="0%" stopColor="#FFD580" />
                    <stop offset="40%" stopColor="#FF8C00" />
                    <stop offset="80%" stopColor="#CC4400" />
                    <stop offset="100%" stopColor="#8B2500" />
                  </radialGradient>
                </defs>
                <circle cx="36" cy="42" r="26" fill="url(#loader-og)" />
                <path d="M36 16 C36 16 30 6 20 8 C26 10 30 16 36 16Z" fill="#2D7A3A" />
                <path d="M36 16 C36 16 44 4 54 7 C46 10 40 15 36 16Z" fill="#3D9A4A" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="font-playfair text-[32px] font-bold tracking-wide">
            Dr.<span className="text-orange-primary">Orange</span>
          </div>

          {/* Progress bar */}
          <div
            className="overflow-hidden rounded-sm"
            style={{
              width: 200,
              height: 2,
              background: 'rgba(255,140,0,0.15)',
            }}
          >
            <div
              className="h-full rounded-sm"
              style={{
                background: 'linear-gradient(90deg,var(--orange),var(--orange-red))',
                animation: 'loadBar 2s cubic-bezier(.4,0,.2,1) forwards',
              }}
            />
          </div>

          {/* Subtitle */}
          <div
            className="font-mono text-xs tracking-[3px] uppercase"
            style={{ color: 'var(--muted)' }}
          >
            Initializing AI Diagnostics
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
