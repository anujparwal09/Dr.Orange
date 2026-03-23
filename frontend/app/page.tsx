'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, Sun, Calendar, Activity, FileText, MessageSquare } from 'lucide-react';
import OrangeLogo from '@/components/OrangeLogo';

/* ============ COUNT-UP HOOK ============ */
function useCountUp(target: number, decimals = 0, suffix = '', duration = 2000) {
  const [value, setValue] = useState('0' + suffix);
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          let startTime: number | null = null;
          const step = (ts: number) => {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const val = target * ease;
            setValue(
              (decimals ? val.toFixed(decimals) : Math.floor(val).toString()) +
                suffix
            );
            if (progress < 1) requestAnimationFrame(step);
            else
              setValue(
                (decimals ? target.toFixed(decimals) : target.toString()) +
                  suffix
              );
          }
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, decimals, suffix, duration]);

  return { ref, value };
}

/* ============ FEATURE DATA ============ */
const features = [
  {
    icon: <Search className="w-6 h-6 stroke-orange-primary" />,
    title: 'Disease Detection',
    desc: 'Identifies Citrus Canker, Melanose, Greening, Black Spot, and Healthy with 97.7% accuracy in one forward pass.',
    tag: 'Classification Head',
  },
  {
    icon: <Sun className="w-6 h-6 stroke-orange-primary" />,
    title: 'Quality Score',
    desc: 'Regression head outputs a 1–10 quality score for commercial grading — replacing subjective manual inspection.',
    tag: 'Regression Head',
  },
  {
    icon: <Calendar className="w-6 h-6 stroke-orange-primary" />,
    title: 'Shelf Life Forecast',
    desc: "Predict remaining freshness days before spoilage — helping exporters optimize inventory and reduce 30% post-harvest waste.",
    tag: 'Regression Head',
  },
  {
    icon: <Activity className="w-6 h-6 stroke-orange-primary" />,
    title: 'Ripeness Stage',
    desc: 'Four-stage classification: Unripe → Near-Ripe → Ripe → Overripe. Know exactly when to pick, ship, or sell.',
    tag: 'Classification Head',
  },
  {
    icon: <FileText className="w-6 h-6 stroke-orange-primary" />,
    title: 'Detailed PDF Report',
    desc: 'Auto-generate detailed diagnosis reports with treatment recommendations and QR verification code.',
    tag: 'Report Engine',
  },
  {
    icon: <MessageSquare className="w-6 h-6 stroke-orange-primary" />,
    title: 'Dr. Orange AI Chat',
    desc: 'Gemini-powered assistant trained on orange agronomy. Ask about diseases, treatment protocols, and harvest timing in natural language.',
    tag: '',
  },
];

const howSteps = [
  {
    num: '01',
    title: 'Upload Image',
    desc: 'Drag & drop or take a photo with your phone. Supports JPG, PNG, WEBP. Any background — our model is robust.',
  },
  {
    num: '02',
    title: 'AI Analyzes',
    desc: 'MobileNetV2 backbone runs 4 simultaneous prediction heads. Disease, quality, shelf life, ripeness — all in one forward pass.',
  },
  {
    num: '03',
    title: 'Full Report',
    desc: 'Get an interactive dashboard with gauges, charts, and confidence scores. Download bilingual PDF or share via link.',
  },
];

/* ============ STAGGER ANIMATION CONFIG ============ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const stat1 = useCountUp(12400, 0, '');
  const stat2 = useCountUp(5, 0, '');
  const stat3 = useCountUp(97.7, 1, '%');
  const stat4 = useCountUp(3, 0, 's');

  return (
    <div className="min-h-screen relative z-[1]">
      {/* ============ HERO ============ */}
      <section
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ padding: '80px 40px 60px' }}
      >
        <div className="text-center max-w-[860px] relative z-[2]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 mb-8"
            style={{
              background: 'rgba(255,140,0,0.08)',
              border: '1px solid rgba(255,140,0,0.3)',
              color: 'var(--orange)',
              padding: '6px 16px',
              borderRadius: 40,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '.5px',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--orange)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            🍊 Powered by Multi-Task Deep Learning
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.35, duration: 0.8 }}
            className="font-playfair font-black leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(52px,7vw,88px)' }}
          >
            Your Orange&apos;s<br />
            <span
              className="block"
              style={{
                background: 'linear-gradient(135deg,var(--orange) 0%,var(--orange-red) 60%,#FFB347 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Personal Physician.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-lg leading-[1.7] max-w-[560px] mx-auto mb-10 font-light"
            style={{ color: 'var(--muted)' }}
          >
            Upload a photo. Get <strong className="text-cream font-medium">disease diagnosis</strong>, quality score,
            shelf life &amp; ripeness — in <strong className="text-cream font-medium">under 3 seconds</strong>.
            Because oranges deserve healthcare too.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.65, duration: 0.8 }}
            className="flex gap-4 justify-center flex-wrap mb-16"
          >
            <Link
              href="/analyze"
              className="no-underline relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg,var(--orange),var(--orange-red))',
                color: '#fff',
                padding: '14px 32px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                letterSpacing: '.3px',
                cursor: 'none',
                transition: 'all .25s',
              }}
            >
              🔬 Scan Your Orange →
            </Link>
            <Link
              href="/about"
              className="no-underline"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--cream)',
                padding: '14px 32px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '.3px',
                cursor: 'none',
                transition: 'all .25s',
              }}
            >
              Watch Demo ▶
            </Link>
          </motion.div>

          {/* ============ ORANGE ILLUSTRATION ============ */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.8, duration: 0.8 }}
            className="relative mx-auto"
            style={{ width: 240, height: 240 }}
          >
            <div
              className="absolute rounded-full"
              style={{
                inset: -20,
                border: '2px dashed rgba(255,140,0,0.4)',
                animation: 'spin 8s linear infinite',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                inset: -36,
                border: '1px solid rgba(255,140,0,0.15)',
                animation: 'spin 14s linear infinite reverse',
              }}
            />
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
              className="absolute rounded-full"
              style={{
                width: 200,
                height: 200,
                background: 'radial-gradient(circle at 35% 30%,#FFD580,#FF8C00 40%,#CC4400 80%,#8B2500)',
                top: 20,
                left: 20,
                boxShadow: '0 20px 60px rgba(255,140,0,0.4), inset -20px -20px 40px rgba(0,0,0,0.3)',
              }}
            />
            <motion.svg
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
              className="absolute"
              style={{ top: -10, left: 96, width: 50, height: 70 }}
              viewBox="0 0 50 70"
              fill="none"
            >
              <path d="M25 65 C25 65 5 50 8 25 C12 5 35 2 42 20 C48 35 35 55 25 65Z" fill="#2D7A3A" />
              <path d="M25 65 C25 65 20 45 22 30 C24 20 30 10 25 65Z" fill="#1D5A2A" opacity="0.4" />
            </motion.svg>
            {/* Scan brackets */}
            <div className="absolute pointer-events-none" style={{ inset: -12 }}>
              <div className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: '2px solid var(--orange)', borderLeft: '2px solid var(--orange)', opacity: 0.8 }} />
              <div className="absolute top-0 right-0 w-4 h-4" style={{ borderTop: '2px solid var(--orange)', borderRight: '2px solid var(--orange)', opacity: 0.8 }} />
              <div className="absolute bottom-0 left-0 w-4 h-4" style={{ borderBottom: '2px solid var(--orange)', borderLeft: '2px solid var(--orange)', opacity: 0.8 }} />
              <div className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: '2px solid var(--orange)', borderRight: '2px solid var(--orange)', opacity: 0.8 }} />
            </div>
            <div
              className="absolute left-2.5 right-2.5"
              style={{
                height: 2,
                background: 'linear-gradient(90deg,transparent,rgba(255,140,0,0.8),transparent)',
                top: '50%',
                animation: 'scanline 2.5s ease-in-out infinite',
                filter: 'drop-shadow(0 0 6px var(--orange))',
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <div
        className="flex justify-center flex-wrap relative z-[2]"
        style={{
          background: 'rgba(255,140,0,0.05)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '28px 40px',
        }}
      >
        {[
          { ref: stat3.ref, value: stat3.value, label: 'Model Accuracy' },
          { ref: stat4.ref, value: stat4.value, label: 'Avg Detection Time' },
        ].map((stat, i) => (
          <div
            key={i}
            className="flex-1 max-w-[220px] text-center px-5 relative"
          >
            {i > 0 && (
              <div
                className="absolute left-0 hidden sm:block"
                style={{
                  top: '10%',
                  height: '80%',
                  width: 1,
                  background: 'var(--border)',
                }}
              />
            )}
            <span
              ref={stat.ref}
              className="font-mono text-[32px] font-semibold block leading-none"
              style={{ color: 'var(--orange)' }}
            >
              {stat.value}
            </span>
            <span
              className="text-xs mt-1.5 block"
              style={{ color: 'var(--muted)', letterSpacing: '.5px' }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ============ FEATURES ============ */}
      <section className="relative z-[2]" style={{ padding: '100px 40px' }}>
        <div className="text-center max-w-[620px] mx-auto">
          <motion.span
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7 }}
            className="font-mono text-[11px] uppercase tracking-[3px] block mb-3.5"
            style={{ color: 'var(--orange)' }}
          >
            Capabilities
          </motion.span>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="font-playfair font-bold leading-[1.15] mb-4"
            style={{ fontSize: 'clamp(34px,4.5vw,52px)' }}
          >
            Four diagnoses.<br />One image.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-base leading-[1.7] mx-auto"
            style={{ color: 'var(--muted)', maxWidth: 500 }}
          >
            Our Multi-Task Learning CNN simultaneously outputs disease, quality, shelf life, and ripeness — no lab required.
          </motion.p>
        </div>

        <div
          className="mt-16 overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
            gap: 1,
            background: 'var(--border)',
            borderRadius: 20,
            border: '1px solid var(--border)',
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.1, duration: 0.7 }}
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden transition-all duration-[350ms]"
              style={{
                background: 'var(--bg2)',
                padding: '44px 36px',
              }}
            >
              <div
                className="w-[52px] h-[52px] flex items-center justify-center mb-6 transition-all duration-[350ms]"
                style={{
                  background: 'rgba(255,140,0,0.1)',
                  border: '1px solid rgba(255,140,0,0.2)',
                  borderRadius: 14,
                }}
              >
                {f.icon}
              </div>
              <div className="font-playfair text-xl font-bold mb-2.5 text-cream">{f.title}</div>
              <div className="text-sm leading-[1.7]" style={{ color: 'var(--muted)' }}>{f.desc}</div>
              {f.tag && (
                <span
                  className="inline-block mt-4 font-mono text-[10px]"
                  style={{
                    color: 'var(--orange)',
                    background: 'rgba(255,140,0,0.08)',
                    border: '1px solid rgba(255,140,0,0.2)',
                    padding: '3px 10px',
                    borderRadius: 20,
                  }}
                >
                  {f.tag}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        className="relative z-[2]"
        style={{
          padding: '100px 40px',
          background: 'rgba(255,140,0,0.02)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="text-center">
          <motion.span
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="font-mono text-[11px] uppercase tracking-[3px] block mb-3.5"
            style={{ color: 'var(--orange)' }}
          >
            Process
          </motion.span>
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-playfair font-bold leading-[1.15]"
            style={{ fontSize: 'clamp(34px,4.5vw,52px)' }}
          >
            From field to diagnosis.<br />
            <span style={{ color: 'var(--orange)' }}>3 steps. 3 seconds.</span>
          </motion.h2>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16 relative"
        >
          {/* connecting line (desktop) */}
          <div
            className="hidden md:block absolute z-0"
            style={{
              top: 36,
              left: 'calc(16.67% + 20px)',
              right: 'calc(16.67% + 20px)',
              height: 1,
              background: 'linear-gradient(90deg,transparent,var(--orange),transparent)',
            }}
          />
          {howSteps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.7 }}
              className="text-center relative z-[1]"
            >
              <div
                className="w-[72px] h-[72px] mx-auto mb-6 flex items-center justify-center font-mono text-xl font-semibold relative transition-all duration-300"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--border2)',
                  borderRadius: '50%',
                  color: 'var(--orange)',
                }}
              >
                {step.num}
                <div
                  className="absolute rounded-full"
                  style={{
                    inset: -6,
                    border: '1px dashed rgba(255,140,0,0.2)',
                    animation: 'spin 10s linear infinite',
                  }}
                />
              </div>
              <div className="font-playfair text-lg font-bold mb-2.5">{step.title}</div>
              <div className="text-sm leading-[1.7]" style={{ color: 'var(--muted)' }}>{step.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ TAGLINE STRIP ============ */}
      <section className="relative z-[2]" style={{ padding: '70px 40px', textAlign: 'center' }}>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="font-playfair font-bold leading-[1.4] max-w-[680px] mx-auto text-cream"
          style={{ fontSize: 'clamp(20px,3vw,32px)' }}
        >
          &ldquo;MBBS in Melanose. PhD in Post-Harvest.<br />
          <span style={{ color: 'var(--orange)' }}>Because oranges deserve better healthcare.</span>&rdquo;
        </motion.div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex gap-3 justify-center flex-wrap"
        >
          {['One Scan. Full Report.', 'MBBS in Melanose', 'Built for Indian Agriculture'].map((t) => (
            <span
              key={t}
              className="font-mono text-xs"
              style={{
                background: 'rgba(255,140,0,0.1)',
                border: '1px solid rgba(255,140,0,0.25)',
                padding: '6px 14px',
                borderRadius: 20,
                color: 'var(--orange)',
              }}
            >
              {t}
            </span>
          ))}
        </motion.div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <Link
            href="/analyze"
            className="inline-block no-underline"
            style={{
              background: 'linear-gradient(135deg,var(--orange),var(--orange-red))',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'none',
              transition: 'all .25s',
            }}
          >
            Start Your First Scan →
          </Link>
        </motion.div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer
        className="relative z-[2]"
        style={{
          background: 'rgba(0,0,0,0.5)',
          borderTop: '1px solid var(--border)',
          padding: '60px 40px 40px',
        }}
      >
        <div
          className="mb-12"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
            gap: 40,
          }}
        >
          <div>
            <OrangeLogo size={32} showText={true} textSize="20px" />
            <p className="text-sm leading-[1.7] mt-4 max-w-[240px]" style={{ color: 'var(--muted)' }}>
              AI-powered orange health diagnostics for India&apos;s farmers. Built with ❤️ for Indian agriculture.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-cream mb-4">Product</div>
            <Link href="/analyze" className="block text-sm no-underline mb-2.5 transition-colors" style={{ color: 'var(--muted)', cursor: 'none' }}>Analyzer</Link>
            <Link href="/dashboard" className="block text-sm no-underline mb-2.5 transition-colors" style={{ color: 'var(--muted)', cursor: 'none' }}>Dashboard</Link>
            <Link href="/chat" className="block text-sm no-underline mb-2.5 transition-colors" style={{ color: 'var(--muted)', cursor: 'none' }}>AI Chat</Link>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-cream mb-4">Company</div>
            <Link href="/about" className="block text-sm no-underline mb-2.5 transition-colors" style={{ color: 'var(--muted)', cursor: 'none' }}>About</Link>
            <a href="#" className="block text-sm no-underline mb-2.5 transition-colors" style={{ color: 'var(--muted)', cursor: 'none' }}>Research</a>
            <a href="#" className="block text-sm no-underline mb-2.5 transition-colors" style={{ color: 'var(--muted)', cursor: 'none' }}>Blog</a>
          </div>
          <div>
            <div className="font-mono text-[13px] font-semibold uppercase tracking-wider text-orange-primary mb-4">Built By</div>
            <div className="text-sm leading-[1.8]" style={{ color: 'var(--muted)' }}>
              <span className="text-cream font-medium">Anuj Parwal</span> <span className="text-xs">(Full Stack Developer)</span><br />
              <div className="mt-2.5 flex flex-col gap-2">
                <a href="https://github.com/anujparwal09/Dr.Orange" target="_blank" rel="noreferrer" className="no-underline text-[13px] hover:text-orange-primary transition-colors block" style={{ color: 'var(--muted)' }}>GitHub Repository</a>
                <a href="https://www.linkedin.com/in/anuj-parwal-805829283/" target="_blank" rel="noreferrer" className="no-underline text-[13px] hover:text-orange-primary transition-colors block" style={{ color: 'var(--muted)' }}>LinkedIn Profile</a>
                <span className="text-[13px] block mt-0.5">Phone: +91-9579944504</span>
              </div>
            </div>
          </div>
        </div>
        <div
          className="flex items-center justify-between pt-7"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
            © 2025 <span className="text-orange-primary">Dr. Orange</span>
          </div>
          <div
            className="font-mono text-[11px] tracking-[2px]"
            style={{ color: 'rgba(255,140,0,0.4)' }}
          >
            MBBS IN MELANOSE
          </div>
        </div>
      </footer>
    </div>
  );
}
