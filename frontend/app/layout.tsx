import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import ParticleBackground from '@/components/ParticleBackground';
import FallingOranges from '@/components/FallingOranges';
import GlowOrbs from '@/components/GlowOrbs';
import CustomCursor from '@/components/CustomCursor';
import Loader from '@/components/Loader';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/app/context/AuthContext';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dr. Orange — MBBS in Melanose',
  description:
    'AI-powered orange disease detection, quality scoring, shelf life prediction, and ripeness classification. Built for Indian agriculture.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-dm">
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
        <Loader />
        <ParticleBackground />
        <FallingOranges />
        <GlowOrbs />
        <CustomCursor />
        <AuthProvider>
          <Navbar />
          <main className="relative z-10">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
