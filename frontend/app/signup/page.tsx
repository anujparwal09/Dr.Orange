'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/app/context/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();

  const handleGoogleResponse = useCallback(async (response: any) => {
    if (!response.credential) {
      setErrorMsg('Google sign-in failed. Please try again.');
      return;
    }

    setGoogleLoading(true);
    setErrorMsg('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
      const res = await axios.post(`${apiUrl}/api/auth/google`, {
        credential: response.credential,
      });
      login(res.data.data.token, res.data.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  }, [login, router]);

  useEffect(() => {
    const initGoogleSignIn = () => {
      if (window.google && GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        const googleButtonDiv = document.getElementById('google-signup-btn');
        if (googleButtonDiv) {
          window.google.accounts.id.renderButton(googleButtonDiv, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 332,
          });
        }
      }
    };

    // Google script may already be loaded or may load after
    if (window.google) {
      initGoogleSignIn();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          initGoogleSignIn();
        }
      }, 100);

      // Clean up after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
      return () => clearInterval(interval);
    }
  }, [handleGoogleResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg("Passwords do not match");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dr-orange.onrender.com';
      const res = await axios.post(`${apiUrl}/api/auth/signup`, { name, email, password });
      login(res.data.data.token, res.data.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative z-[2]" style={{ padding: 40 }}>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.8 }}
        className="w-full max-w-[420px]"
        style={{
          background: 'rgba(20,15,10,0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border)',
          borderRadius: 24,
          padding: 44,
          boxShadow: '0 0 80px rgba(255,140,0,0.12), 0 40px 80px rgba(0,0,0,0.4)',
        }}
      >
        <div className="text-center mb-8">
          <svg width={52} height={52} viewBox="0 0 38 38" className="mx-auto">
            <defs>
              <radialGradient id="signup-og" cx="38%" cy="32%">
                <stop offset="0%" stopColor="#FFD580" />
                <stop offset="45%" stopColor="#FF8C00" />
                <stop offset="100%" stopColor="#CC4400" />
              </radialGradient>
            </defs>
            <circle cx="19" cy="23" r="13" fill="url(#signup-og)" />
            <path d="M19 10 C19 10 15 3 9 4.5 C13 6 16.5 10 19 10Z" fill="#2D7A3A" />
            <path d="M19 10 C19 10 24 2 31 4 C25 6 21 9 19 10Z" fill="#3D9A4A" />
          </svg>
        </div>

        <div className="font-playfair text-[26px] font-bold text-center mb-2">Create account</div>
        <div className="text-sm text-center mb-8" style={{ color: 'var(--muted)' }}>
          Join Dr. Orange to start diagnosing your oranges with AI
        </div>

        {errorMsg && (
          <div className="mb-4 text-xs p-3 text-center rounded-lg bg-orange-950/20" style={{ color: 'var(--orange-red)', border: '1px solid rgba(255,69,0,0.3)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Full name', type: 'text', placeholder: 'Arjun Patel', value: name, setter: setName },
            { label: 'Email address', type: 'email', placeholder: 'you@example.com', value: email, setter: setEmail },
            { label: 'Password', type: 'password', placeholder: 'Create a password', value: password, setter: setPassword },
            { label: 'Confirm password', type: 'password', placeholder: 'Repeat your password', value: confirm, setter: setConfirm },
          ].map((field) => (
            <div key={field.label} className="mb-4">
              <label className="text-xs block mb-1.5" style={{ color: 'var(--muted)', letterSpacing: '.3px' }}>
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                className="w-full outline-none transition-colors duration-200"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,140,0,0.2)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  color: 'var(--cream)',
                  fontSize: 14,
                  fontFamily: 'var(--font-dm), sans-serif',
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 transition-all duration-250"
            style={{
              background: 'linear-gradient(135deg,var(--orange),var(--orange-red))',
              color: '#fff',
              padding: 14,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {loading ? (
              <div
                className="w-5 h-5 mx-auto rounded-full"
                style={{
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : (
              'Create Account →'
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6 text-xs" style={{ color: 'var(--muted)' }}>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          or
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Google Sign-In Button */}
        {googleLoading ? (
          <div className="w-full flex items-center justify-center gap-2.5 transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--cream)',
              padding: 12,
              borderRadius: 10,
              fontSize: 14,
            }}
          >
            <div
              className="w-5 h-5 rounded-full"
              style={{
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            Signing in with Google...
          </div>
        ) : GOOGLE_CLIENT_ID ? (
          <div
            id="google-signup-btn"
            className="flex justify-center"
            style={{ minHeight: 44 }}
          />
        ) : (
          <button
            onClick={() => setErrorMsg('Google Sign-In is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local')}
            className="w-full flex items-center justify-center gap-2.5 transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--cream)',
              padding: 12,
              borderRadius: 10,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        )}

        <div className="text-center mt-6 text-[13px]" style={{ color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="no-underline" style={{ color: 'var(--orange)', cursor: 'pointer' }}>
            Sign in →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
