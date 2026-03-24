'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import OrangeLogo from '@/components/OrangeLogo';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

const aboutCards = [
  {
    title: '🔍 The Problem',
    text: "Farmers can't see early-stage diseases like Citrus Canker until 40–60% of the crop is already lost. Quality grading is manual, subjective, and inconsistent. India wastes ~30% of orange produce post-harvest without shelf-life forecasting.",
  },
  {
    title: '🧠 The Solution',
    text: 'A Multi-Task Learning CNN with MobileNetV2 backbone and 4 output heads. One forward pass yields disease classification, quality regression, shelf-life regression, and ripeness stage — simultaneously.',
  },
  {
    title: '📊 Architecture',
    text: 'MobileNetV2 backbone → shared feature extractor → 4 specialized heads. Trained with weighted multi-task loss. Achieves 97.7% disease accuracy with <3s inference on CPU. Saved as .h5 and served via Flask REST API.',
  },
  {
    title: '🌾 Real Impact',
    text: 'Give any farmer or agronomist an instant phone-based diagnosis. Upload a photo, get a full detailed report with treatment recommendations, QR verification, and actionable next steps.',
  },
];

const techPills = [
  'TensorFlow / Keras', 'MobileNetV2', 'MTL Architecture', 'Flask REST API',
  'SQLite + SQLAlchemy', 'Next.js 14', 'Tailwind CSS', 'Gemini 2.5 Flash',
  'JWT Auth', 'ReportLab PDF', 'Recharts', 'Framer Motion', 'Python 3.11',
  'Vercel + Render',
];

export default function AboutPage() {
  return (
    <div className="relative z-[2]">
      {/* Hero */}
      <div className="text-center relative z-[2] pt-[140px] px-10 pb-20">
        <motion.span
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="font-mono text-[11px] uppercase tracking-[3px] block mb-3.5 text-orange-custom"
        >
          The Mission
        </motion.span>
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-playfair font-bold max-w-[700px] mx-auto mb-5 text-[clamp(40px,5vw,64px)]"
        >
          Built for India&apos;s<br />
          <span className="text-orange-custom">Orange Farmers</span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-[17px] max-w-[580px] mx-auto leading-[1.75] text-muted"
        >
          Dr. Orange solves a real agricultural problem — invisible early-stage diseases,
          subjective manual grading, and 30% post-harvest waste — with a Multi-Task Learning
          deep learning system anyone can use on their phone.
        </motion.p>
      </div>

      {/* About grid */}
      <div
        className="overflow-hidden grid grid-cols-2 gap-px my-[60px] mx-10 bg-border-custom border-border-custom rounded-[24px]"
      >
        {aboutCards.map((card, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.7 }}
            className="transition-colors duration-300 bg-bg2 p-11"
          >
            <div className="font-playfair text-[22px] font-bold mb-3.5 text-cream">
              {card.title}
            </div>
            <div className="text-[15px] leading-[1.75] text-muted">
              {card.text}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="relative z-[2] px-10 py-[60px]">
        <span
          className="font-mono text-[11px] uppercase tracking-[3px] block mb-3.5 text-orange-custom"
        >
          Tech Stack
        </span>
        <h3 className="font-playfair text-[28px] font-bold mb-8">Built with precision</h3>
        <div className="flex flex-wrap gap-3">
          {techPills.map((pill) => (
            <motion.span
              key={pill}
              whileHover={{
                borderColor: 'var(--orange)',
                color: 'var(--orange)',
                background: 'rgba(255,140,0,0.08)',
              }}
              className="font-mono text-xs transition-all duration-250 bg-[var(--glass)] border-border-custom py-2 px-[18px] rounded-[40px] text-muted cursor-none-custom"
            >
              {pill}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="relative z-[2] bg-[rgba(0,0,0,0.5)] border-t-border-custom px-10 pt-[60px] pb-10"
      >
        <div
          className="mb-12 grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-10"
        >
          <div>
            <OrangeLogo size={32} showText={true} textSize="20px" />
            <p className="text-sm leading-[1.7] mt-4 max-w-[240px] text-muted">
              AI-powered orange health diagnostics for India&apos;s farmers.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-cream mb-4">Product</div>
            <Link href="/analyze" className="block text-sm no-underline mb-2.5 text-muted cursor-none-custom">Analyzer</Link>
            <Link href="/dashboard" className="block text-sm no-underline mb-2.5 text-muted cursor-none-custom">Dashboard</Link>
            <Link href="/chat" className="block text-sm no-underline mb-2.5 text-muted cursor-none-custom">AI Chat</Link>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-cream mb-4">Company</div>
            <a href="#" className="block text-sm no-underline mb-2.5 text-muted cursor-none-custom">Research</a>
            <a href="#" className="block text-sm no-underline mb-2.5 text-muted cursor-none-custom">Blog</a>
            <a href="#" className="block text-sm no-underline mb-2.5 text-muted cursor-none-custom">Contact</a>
          </div>
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-cream mb-4">Connect</div>
            <a href="https://github.com/anujparwal09/Dr.Orange" target="_blank" rel="noopener noreferrer" className="block text-sm no-underline mb-2.5 text-muted">GitHub</a>
          </div>
        </div>
        <div className="flex items-center justify-between pt-7 border-t-border-custom">
          <div className="text-[13px] text-muted">
            © 2025 <span className="text-orange-primary">Dr. Orange</span> — Made with ❤️ for Indian Agriculture
          </div>
          <div className="font-mono text-[11px] tracking-[2px] opacity-40 text-orange-custom">
            MBBS IN MELANOSE
          </div>
        </div>
      </footer>
    </div>
  );
}
