import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, KeyRound } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);

  useEffect(() => {
    // Previously flipped to "valid" the instant the URL hash merely
    // contained "access_token=" - true even for an expired/tampered link,
    // before Supabase had actually verified anything. Now only a real
    // session (confirmed via getSession, or the PASSWORD_RECOVERY/SIGNED_IN
    // event once detectSessionInUrl finishes processing the link) counts,
    // with a bounded wait before treating the link as invalid.
    let resolved = false;

    const markValid = () => {
      resolved = true;
      setIsSessionValid(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markValid();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        markValid();
      }
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        toast.error("Invalid or expired reset session. Please use the link from your email.");
        navigate({ to: "/auth" });
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast.success("Password updated successfully!");
      // Sign out to ensure they log in with the new password
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (!isSessionValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground tracking-tighter">HASAN KAMRUL</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set your new account password
          </p>
        </div>

        <Card className="border-muted shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Update Password</CardTitle>
            <CardDescription>
              Enter a secure password to regain access
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleReset}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="New Password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Confirm New Password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full font-bold" 
                disabled={loading}
              >
                {loading ? "Updating..." : "Reset Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
