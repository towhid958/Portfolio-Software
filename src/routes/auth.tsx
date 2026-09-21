import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reveal } from '@/components/motion/Reveal';
import { toast } from 'sonner';
import { Lock, Mail } from 'lucide-react';
import { z } from 'zod';
import { getErrorMessage } from '@/lib/utils';

export const Route = createFileRoute('/auth')({
  component: AuthPage,
  validateSearch: (search) =>
    z
      .object({
        redirect: z.string().optional(),
        error: z.string().optional(),
      })
      .parse(search),
});

const MIN_PASSWORD_LENGTH = 6;

// Supabase's own error text is otherwise shown to the user verbatim, which
// can reveal whether an email is already registered (signup) or leaks a
// raw driver/network error string. Normalizes the known cases; anything
// else falls back to a generic message rather than the raw error.
function getFriendlyAuthError(error: unknown, context: 'signup' | 'signin' | 'reset'): string {
  const raw = error instanceof Error ? error.message : '';
  if (context === 'signup' && /already registered|already exists/i.test(raw)) {
    return 'Unable to create an account with these details. If you already have an account, try signing in instead.';
  }
  if (context === 'signin' && /invalid login credentials/i.test(raw)) {
    return 'Invalid email or password.';
  }
  const fallback =
    context === 'signup'
      ? 'Failed to sign up'
      : context === 'reset'
        ? 'Failed to reset password'
        : 'Failed to sign in';
  // "Email not confirmed" and other Supabase-authored, already user-facing
  // messages are safe to pass through as-is; only unstructured/raw errors
  // fall back to the generic message above.
  return raw || fallback;
}

function AuthPage() {
  const { redirect: redirectUrl, error: searchError } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);

  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (searchError) {
      if (searchError.includes('access_denied')) {
        toast.error("Access denied. You may have cancelled the login or don't have permission.");
      } else if (searchError.includes('Unauthorized')) {
        toast.error('Unauthorized: Only registered administrators can access this area.');
      } else if (
        searchError.toLowerCase().includes('email not confirmed') ||
        searchError.toLowerCase().includes('verify your email')
      ) {
        toast.error('Please verify your email address before signing in.');
      } else {
        toast.error(searchError);
      }
    }
  }, [searchError]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address first.');
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      toast.success('Verification email resent! Please check your inbox.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to resend verification email'));
    } finally {
      setResending(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent! Please check your email.');
        setIsResetPassword(false);
      } else if (isSignUp) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        toast.success('Registration successful! Please check your email for verification.');
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Route by the account's actual role, not a hardcoded email - keeps
        // this consistent with the role check in /admin's and /dashboard's
        // route guards.
        const userId = signInData.user?.id;
        const { data: roles } = userId
          ? await supabase.from('user_roles').select('role').eq('user_id', userId)
          : { data: null };
        const hasAdminAccess = roles?.some((r) =>
          ['super_admin', 'admin', 'editor', 'staff'].includes(r.role),
        );

        // Admin and the client portal are separate account pools - an
        // explicit attempt to reach one side with credentials for the
        // other is rejected outright, not silently redirected to wherever
        // that account actually belongs. Only an actual /admin redirect
        // counts as an admin login attempt; everything else (including
        // the public site's generic "Login" link, which has no redirect
        // context) is treated as the client portal, so an admin account
        // must always enter through /admin specifically.
        const wantsAdmin = redirectUrl?.startsWith('/admin') ?? false;
        const wantsClientPortal = !wantsAdmin;

        if (wantsAdmin && !hasAdminAccess) {
          await supabase.auth.signOut();
          toast.error("This account doesn't have admin access.");
          return;
        }

        if (wantsClientPortal && hasAdminAccess) {
          await supabase.auth.signOut();
          toast.error("Admin accounts can't sign in to the client portal.");
          return;
        }

        toast.success('Welcome back!');
        navigate({ to: hasAdminAccess ? redirectUrl || '/admin' : redirectUrl || '/dashboard' });
      }
    } catch (error) {
      const context = isResetPassword ? 'reset' : isSignUp ? 'signup' : 'signin';
      toast.error(getFriendlyAuthError(error, context));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-royal-canvas px-4 py-12 font-sans-body text-royal-ink">
      {/* Same ambient wash as the public page heroes so the portal doesn't
          feel like a different product. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-royal-deep/12 via-royal-sapphire/10 to-royal-gold/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-24 h-[360px] w-[360px] rounded-full bg-royal-gold/10 blur-[110px]" />
      </div>

      <Reveal className="relative w-full max-w-md space-y-7">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="font-sans-body text-xl font-extrabold tracking-tight text-royal-ink">
              HASAN KAMRUL
            </span>
            <span className="h-2 w-2 rounded-full bg-royal-gold shadow-[0_0_10px_rgba(212,175,55,0.7)]" />
          </Link>
          <h1 className="mt-5 font-sans-body text-3xl font-extrabold tracking-tight text-royal-ink">
            Client &amp; Admin Portal
          </h1>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-royal-deep via-royal-gold to-royal-sapphire" />
          <p className="mt-3 text-sm text-slate-600">Sign in to access your secure dashboard</p>
        </div>

        <div className="rounded-3xl border border-royal-deep/15 bg-white p-7 shadow-[0_16px_40px_rgba(12,27,51,0.12)]">
          <div className="space-y-1 text-center">
            <h2 className="font-sans-body text-xl font-extrabold text-royal-ink">
              {isResetPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Login'}
            </h2>
            <p className="text-sm text-slate-600">
              {isResetPassword
                ? 'Enter your email to receive a reset link'
                : isSignUp
                  ? 'Register to request admin access'
                  : 'Enter your credentials to continue'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="mt-6">
            <div className="grid gap-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  aria-label="Email address"
                  className="h-12 rounded-xl border-royal-deep/15 bg-white pl-11 shadow-sm focus-visible:ring-royal-sapphire"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {!isResetPassword && (
                <div className="grid gap-2">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      aria-label="Password"
                      className="h-12 rounded-xl border-royal-deep/15 bg-white pl-11 shadow-sm focus-visible:ring-royal-sapphire"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
                      disabled={loading}
                    />
                  </div>
                  {isSignUp && (
                    <p className="font-mono-code text-[11px] text-slate-500">
                      At least {MIN_PASSWORD_LENGTH} characters.
                    </p>
                  )}
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsResetPassword(true)}
                      className="text-right font-mono-code text-[11px] text-slate-500 transition-colors hover:text-royal-sapphire"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-royal-gold/35 bg-royal-deep text-sm font-bold uppercase tracking-wider text-royal-gold-light shadow-lg shadow-royal-deep/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading
                  ? isResetPassword
                    ? 'Sending...'
                    : isSignUp
                      ? 'Registering...'
                      : 'Signing in...'
                  : isResetPassword
                    ? 'Send Reset Link'
                    : isSignUp
                      ? 'Sign Up'
                      : 'Sign In'}
              </button>

              <div className="text-center text-sm">
                {isResetPassword ? (
                  <button
                    type="button"
                    onClick={() => setIsResetPassword(false)}
                    className="font-semibold text-royal-sapphire transition-colors hover:text-royal-gold-deep"
                  >
                    Back to Login
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="text-slate-600">
                      {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="font-semibold text-royal-sapphire transition-colors hover:text-royal-gold-deep"
                      >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                      </button>
                    </div>

                    {!isSignUp && (
                      <div className="border-t border-royal-deep/10 pt-3">
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resending || loading}
                          className="w-full font-mono-code text-[11px] text-slate-500 transition-colors hover:text-royal-sapphire disabled:opacity-50"
                        >
                          {resending ? 'Resending...' : "Didn't receive verification email? Resend"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <p className="text-center font-mono-code text-[11px] text-slate-500">
          <Link to="/" className="transition-colors hover:text-royal-deep">
            &larr; Back to site
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
