import React from 'react';

interface OrangeLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
}

export default function OrangeLogo({ size = 38, showText = true, textSize = '22px' }: OrangeLogoProps) {
  const gradientId = `og-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={gradientId} cx="38%" cy="32%">
            <stop offset="0%" stopColor="#FFD580" />
            <stop offset="45%" stopColor="#FF8C00" />
            <stop offset="100%" stopColor="#CC4400" />
          </radialGradient>
        </defs>
        <circle cx="19" cy="23" r="13" fill={`url(#${gradientId})`} />
        <path d="M19 10 C19 10 15 3 9 4.5 C13 6 16.5 10 19 10Z" fill="#2D7A3A" />
        <path d="M19 10 C19 10 24 2 31 4 C25 6 21 9 19 10Z" fill="#3D9A4A" />
        {/* Scan line */}
        <rect x="4" y="22" width="30" height="1.5" fill="rgba(255,200,0,0.7)" rx="0.75" />
        {/* Scan brackets */}
        <rect x="4" y="10" width="4" height="4" fill="none" stroke="#FF8C00" strokeWidth="1.2" />
        <rect x="30" y="10" width="4" height="4" fill="none" stroke="#FF8C00" strokeWidth="1.2" />
        <rect x="4" y="27" width="4" height="4" fill="none" stroke="#FF8C00" strokeWidth="1.2" />
        <rect x="30" y="27" width="4" height="4" fill="none" stroke="#FF8C00" strokeWidth="1.2" />
      </svg>
      {showText && (
        <div>
          <div className="font-playfair font-bold" style={{ fontSize: textSize, color: 'var(--cream)' }}>
            Dr.<span className="text-orange-primary">Orange</span>
            <span
              className="font-mono ml-2 align-middle"
              style={{
                background: 'rgba(255,140,0,0.12)',
                border: '1px solid rgba(255,140,0,0.3)',
                color: 'var(--orange)',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: 20,
                letterSpacing: '1px',
              }}
            >
              AI
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
