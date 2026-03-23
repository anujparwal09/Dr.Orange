'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import OrangeLogo from './OrangeLogo';
import { useAuth } from '@/app/context/AuthContext';
import './Navbar.css';

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
        className="nav-progress"
        style={{
          transform: showProgress ? 'scaleX(1)' : 'scaleX(0)',
        }}
      />

      <nav
        className="navbar"
        style={{
          height: scrolled ? 64 : 72,
          background: scrolled ? 'rgba(7,7,7,0.95)' : 'rgba(7,7,7,0.8)',
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
              className="nav-link"
              style={{
                color: pathname === link.href ? 'var(--orange)' : 'var(--muted)',
              }}
            >
              {link.label}
              <span
                className="nav-link-underline"
                style={{
                  width: pathname === link.href ? '100%' : '0',
                }}
              />
            </Link>
          ))}
          {isAuthenticated && user?.role === 'admin' && (
            <Link
              href="/admin"
              className="nav-link"
              style={{
                color: pathname === '/admin' ? 'var(--orange)' : 'var(--muted)',
              }}
            >
              Admin
              <span
                className="nav-link-underline"
                style={{
                  width: pathname === '/admin' ? '100%' : '0',
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
                type="button"
                onClick={logout}
                className="nav-button-logout hidden md:block"
                title="Logout"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="nav-button-login hidden md:block no-underline"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="nav-button-signup hidden md:block no-underline"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            type="button"
            className="hamburger-button flex md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            title="Toggle Menu"
            aria-label="Toggle Menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mobile-menu md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="mobile-nav-link"
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
                  type="button"
                  onClick={logout}
                  className="mobile-logout-button"
                  title="Logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-3 mt-2">
                <Link
                  href="/login"
                  className="nav-button-login no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="nav-button-signup no-underline"
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
