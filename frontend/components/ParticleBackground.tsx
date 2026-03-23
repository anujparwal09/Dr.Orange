'use client';

import { useRef, useEffect } from 'react';

const PARTICLE_COUNT = 110;
const CONNECTION_DISTANCE = 110;

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  o: number;

  constructor(W: number, H: number) {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.45;
    this.vy = (Math.random() - 0.5) * 0.45;
    this.r = Math.random() * 1.8 + 0.8;
    this.o = Math.random() * 0.08 + 0.04;
  }

  update(W: number, H: number) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0) { this.x = 0; this.vx *= -1; }
    if (this.x > W) { this.x = W; this.vx *= -1; }
    if (this.y < 0) { this.y = 0; this.vy *= -1; }
    if (this.y > H) { this.y = H; this.vy *= -1; }
  }
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let animId: number;

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(W, H));
    }

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    window.addEventListener('resize', resize, { passive: true });

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      // connections
      ctx!.lineWidth = 0.6;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(255,140,0,${(1 - dist / CONNECTION_DISTANCE) * 0.07})`;
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      // particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.update(W, H);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,140,0,${p.o})`;
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      id="particle-canvas"
    />
  );
}
