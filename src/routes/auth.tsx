import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Mail } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (search) => z.object({
    redirect: z.string().optional(),
    error: z.string().optional(),
  }).parse(search),
});

function AuthPage() {
  const { redirect: redirectUrl, error: searchError } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);

  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (searchError) {
      if (searchError.includes('access_denied')) {
        toast.error("Access denied. You may have cancelled the login or don't have permission.");
      } else if (searchError.includes('Unauthorized')) {
        toast.error("Unauthorized: Only registered administrators can access this area.");
      } else if (searchError.toLowerCase().includes('email not confirmed') || searchError.toLowerCase().includes('verify your email')) {
        toast.error("Please verify your email address before signing in.");
      } else {
        toast.error(searchError);
      }
    }
  }, [searchError]);

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      toast.success("Verification email resent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
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
        toast.success("Password reset link sent! Please check your email.");
        setIsResetPassword(false);
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Registration successful! Please check your email for verification.");
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
          ['super_admin', 'admin', 'editor', 'staff'].includes(r.role)
        );

        // Admin and the client portal are separate account pools - an
        // explicit attempt to reach one side with credentials for the
        // other is rejected outright, not silently redirected to wherever
        // that account actually belongs. Only an actual /admin redirect
        // counts as an admin login attempt; everything else (including
        // the public site's generic "Login" link, which has no redirect
        // context) is treated as the client portal, so an admin account
        // must always enter through /admin specifically.
        const wantsAdmin = redirectUrl?.startsWith("/admin") ?? false;
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

        toast.success("Welcome back!");
        navigate({ to: hasAdminAccess ? (redirectUrl || "/admin") : (redirectUrl || "/dashboard") });
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isResetPassword ? 'reset password' : isSignUp ? 'sign up' : 'sign in'}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold tracking-tighter">HASAN KAMRUL</Link>
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">Client & Admin Portal</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your secure dashboard
          </p>
        </div>

        <Card className="border-muted shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">
              {isResetPassword ? "Reset Password" : isSignUp ? "Create Account" : "Login"}
            </CardTitle>
            <CardDescription>
              {isResetPassword 
                ? "Enter your email to receive a reset link" 
                : isSignUp 
                  ? "Register to request admin access" 
                  : "Enter your credentials to continue"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAuth}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              {!isResetPassword && (
                <div className="grid gap-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsResetPassword(true)}
                      className="text-right text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full font-bold" 
                disabled={loading}
              >
                {loading ? (isResetPassword ? "Sending..." : isSignUp ? "Registering..." : "Signing in...") : (isResetPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Sign In")}
              </Button>
              
              
              <div className="mt-2 text-center text-sm">
                {isResetPassword ? (
                  <button
                    type="button"
                    onClick={() => setIsResetPassword(false)}
                    className="font-medium text-primary hover:underline"
                  >
                    Back to Login
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="text-center">
                      {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="font-medium text-primary hover:underline"
                      >
                        {isSignUp ? "Sign In" : "Sign Up"}
                      </button>
                    </div>

                    {!isSignUp && (
                      <div className="pt-2 border-t border-muted/50">
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resending || loading}
                          className="w-full text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                        >
                          {resending ? "Resending..." : "Didn't receive verification email? Resend"}
                        </button>
                      </div>
                    )}


                  </div>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
