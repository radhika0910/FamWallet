'use client';

// ============================================
// Login Page
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signInWithGoogle, signInWithApple, setupRecaptcha, signInWithPhone } from '@/lib/auth';
import ThreeBackground from '@/components/ThreeBackground';
import { Smartphone } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'phone' && !(window as any).recaptchaVerifier) {
      setupRecaptcha('recaptcha-container');
    }
  }, [mode]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('Invalid email or password');
      } else if (msg.includes('user-not-found')) {
        setError('No account found with this email');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhone(phone, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await confirmationResult.confirm(otp);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (!msg.includes('popup-closed')) {
        setError('Google sign-in failed. Try again.');
      }
    }
  };

  const handleApple = async () => {
    setError('');
    try {
      await signInWithApple();
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Apple sign-in failed';
      if (!msg.includes('popup-closed')) {
        setError('Apple sign-in failed. Try again.');
      }
    }
  };

  return (
    <div className="auth-container">
      <ThreeBackground />
      <div className="auth-card" style={{ zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 40 }}>💰</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your FamWallet account</p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        {/* Auth Mode Toggle */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button 
            className={`tab ${mode === 'email' ? 'active' : ''}`} 
            style={{ flex: 1 }}
            onClick={() => { setMode('email'); setError(''); }}
          >
            Email
          </button>
          <button 
            className={`tab ${mode === 'phone' ? 'active' : ''}`} 
            style={{ flex: 1 }}
            onClick={() => { setMode('phone'); setError(''); }}
          >
            Phone
          </button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="input-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>Forgot Password?</Link>
              </div>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{ width: '100%', marginBottom: 16 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div className="input-group">
                  <label className="input-label" htmlFor="login-phone">Phone Number</label>
                  <input
                    id="login-phone"
                    className="input"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <div id="recaptcha-container" style={{ marginTop: 10 }}></div>
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  type="submit"
                  disabled={loading || !phone}
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="input-group">
                  <label className="input-label" htmlFor="login-otp">Verification Code</label>
                  <input
                    id="login-otp"
                    className="input"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  type="submit"
                  disabled={loading || !otp}
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="auth-divider">or continue with</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button className="btn-google" onClick={handleGoogle} type="button" style={{ padding: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          
          <button className="btn-google" onClick={handleApple} type="button" style={{ padding: '10px', background: '#000', color: '#fff' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.53.82 3.19.82.68 0 2.14-.95 3.82-.82 1.58.12 3.01.83 3.85 2.1-3.24 1.94-2.68 6.42.54 7.74-.75 1.83-1.8 3.59-3.4 5.13zm-3.71-13.6c.21-2.45-1.74-4.66-4.14-4.88-.34 2.56 1.95 4.8 4.14 4.88z"/>
            </svg>
            Apple
          </button>
        </div>

        <p className="auth-footer" style={{ marginTop: 32 }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
