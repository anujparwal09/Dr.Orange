'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import OrangeLogo from './OrangeLogo';
import { useAuth } from '@/app/context/AuthContext';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/analyze', label: 'Analyze' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  { href: '/chat', label: 'Chat' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Progress bar flash on route change
  useEffect(() => {
    setShowProgress(true);
    const timer = setTimeout(() => setShowProgress(false), 600);
    setMenuOpen(false);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {/* Progress bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[10001]"
        style={{
          height: 2,
          background: 'linear-gradient(90deg,var(--orange),var(--orange-red))',
          transform: showProgress ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform .3s',
        }}
      />

      <nav
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between"
        style={{
          padding: '0 40px',
          height: scrolled ? 64 : 72,
          background: scrolled ? 'rgba(7,7,7,0.95)' : 'rgba(7,7,7,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          transition: 'all .3s',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 no-underline">
          <OrangeLogo />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium no-underline transition-colors duration-200"
              style={{
                color: pathname === link.href ? 'var(--orange)' : 'var(--muted)',
                letterSpacing: '.3px',
              }}
            >
              {link.label}
              <span
                className="absolute -bottom-1 left-0 h-px transition-all duration-300"
                style={{
                  width: pathname === link.href ? '100%' : '0',
                  background: 'var(--orange)',
                }}
              />
            </Link>
          ))}
          {isAuthenticated && user?.role === 'admin' && (
            <Link
              href="/admin"
              className="relative text-sm font-medium no-underline transition-colors duration-200"
              style={{
                color: pathname === '/admin' ? 'var(--orange)' : 'var(--muted)',
                letterSpacing: '.3px',
              }}
            >
              Admin
              <span
                className="absolute -bottom-1 left-0 h-px transition-all duration-300"
                style={{
                  width: pathname === '/admin' ? '100%' : '0',
                  background: 'var(--orange)',
                }}
              />
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <span className="hidden md:block text-cream font-medium text-[13px] mr-2">
                Hello, {user.name}
              </span>
              <button
                onClick={logout}
                className="hidden md:block no-underline"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border2)',
                  color: 'var(--muted)',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'var(--font-dm), sans-serif',
                  transition: 'all .2s',
                  cursor: 'none',
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden md:block no-underline"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border2)',
                  color: 'var(--orange)',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'var(--font-dm), sans-serif',
                  transition: 'all .2s',
                  cursor: 'none',
                }}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="hidden md:block no-underline"
                style={{
                  background: 'linear-gradient(135deg,var(--orange),var(--orange-red))',
                  color: '#fff',
                  padding: '8px 22px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  fontFamily: 'var(--font-dm), sans-serif',
                  transition: 'all .2s',
                  cursor: 'none',
                }}
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            className="flex md:hidden flex-col gap-[5px] bg-transparent border-none p-1"
            style={{ cursor: 'none' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="block w-6 h-0.5 transition-all duration-300" style={{ background: 'var(--cream)' }} />
            <span className="block w-6 h-0.5 transition-all duration-300" style={{ background: 'var(--cream)' }} />
            <span className="block w-6 h-0.5 transition-all duration-300" style={{ background: 'var(--cream)' }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-[72px] left-0 right-0 z-[99] md:hidden flex flex-col gap-5 p-6"
          style={{
            background: 'rgba(7,7,7,0.98)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium no-underline"
              style={{
                color: pathname === link.href ? 'var(--orange)' : 'var(--muted)',
              }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-3 mt-2 flex-col">
            {isAuthenticated && user ? (
              <>
                <span className="text-cream font-medium text-[13px]">
                  Hello, {user.name}
                </span>
                <button
                  onClick={logout}
                  className="w-full text-left"
                  style={{
                    color: 'var(--muted)',
                    fontSize: 13,
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-3 mt-2">
                <Link
                  href="/login"
                  className="no-underline"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border2)',
                    color: 'var(--orange)',
                    padding: '8px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="no-underline"
                  style={{
                    background: 'linear-gradient(135deg,var(--orange),var(--orange-red))',
                    color: '#fff',
                    padding: '8px 22px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}
