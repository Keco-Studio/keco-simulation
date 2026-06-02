'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { message } from 'antd';
import { useAuth } from '@studio/lib/contexts/AuthContext';
import { useSupabase } from '@studio/lib/SupabaseContext';
import styles from './KecoLoginModal.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
};

export function KecoLoginModal({ open, onClose, onSignedIn }: Props) {
  const supabase = useSupabase();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setErrorMsg(null);
      setPasswordError(false);
      setLoading(false);
      setGoogleLoading(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    onClose();
  }, [open, isAuthenticated, onClose]);

  if (!open || typeof document === 'undefined' || isAuthenticated) return null;

  const finishSignIn = () => {
    onSignedIn?.();
    onClose();
    message.success('Signed in successfully');
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPasswordError(false);

    if (!email.trim() || !password) {
      setErrorMsg('Email and password cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session not established. Please try again.');
      }

      finishSignIn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Incorrect password, please try again.');
        setPasswordError(true);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google login failed');
      setGoogleLoading(false);
    }
  };

  return createPortal(
    <>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="keco-login-title">
        <button type="button" className={styles.closeBtn} aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="keco-login-title" className={styles.title}>
          LOGIN TO KECO
        </h2>

        {errorMsg && !passwordError ? <div className={styles.generalError}>{errorMsg}</div> : null}

        <button
          type="button"
          className={styles.googleBtn}
          disabled={googleLoading || loading}
          onClick={handleGoogleLogin}
        >
          <span>G</span> Login with Google
        </button>

        <div className={styles.divider}>OR</div>

        <form onSubmit={handleLogin}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="keco-login-email">
              Email or username
            </label>
            <input
              id="keco-login-email"
              className={styles.input}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="keco-login-password">
              Password
            </label>
            <input
              id="keco-login-password"
              className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
            />
            {passwordError ? <div className={styles.error}>Incorrect password, please try again.</div> : null}
          </div>
          <button type="button" className={styles.forgot}>
            Forget you password?
          </button>
          <button type="submit" className={styles.loginBtn} disabled={loading || googleLoading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <button type="button" className={styles.footerLink}>
            Sign Up Now
          </button>
        </p>
      </div>
    </>,
    document.body,
  );
}
