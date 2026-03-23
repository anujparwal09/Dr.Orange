'use client';

export default function GlowOrbs() {
  return (
    <>
      {/* Orb 1 — top-left, 700px */}
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 700,
          height: 700,
          background: 'rgba(255,140,0,0.07)',
          filter: 'blur(80px)',
          top: -200,
          left: -200,
          animation: 'orbDrift1 22s ease-in-out infinite',
        }}
      />
      {/* Orb 2 — bottom-right, 600px */}
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 600,
          height: 600,
          background: 'rgba(255,69,0,0.06)',
          filter: 'blur(80px)',
          bottom: -150,
          right: -100,
          animation: 'orbDrift2 18s ease-in-out infinite',
          animationDelay: '-8s',
        }}
      />
      {/* Orb 3 — center, 500px */}
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 500,
          height: 500,
          background: 'rgba(255,180,0,0.05)',
          filter: 'blur(80px)',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'orbDrift3 25s ease-in-out infinite',
          animationDelay: '-14s',
        }}
      />
      {/* Orb 4 — top-right, 300px */}
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 300,
          height: 300,
          background: 'rgba(255,100,0,0.05)',
          filter: 'blur(80px)',
          top: 60,
          right: -40,
          animation: 'orbDrift4 16s ease-in-out infinite',
          animationDelay: '-5s',
        }}
      />
    </>
  );
}
