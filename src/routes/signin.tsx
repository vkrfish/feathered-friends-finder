import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — LearnX" },
      { name: "description", content: "Sign in to your LearnX workspace." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if session is already active; if so, redirect immediately
  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate({ to: "/dashboard" });
      }
    };
    checkActiveSession();
  }, [navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split("@")[0],
            }
          }
        });
        
        if (error) throw error;
        
        if (data.session) {
          toast.success("Account created and logged in!");
          navigate({ to: "/dashboard" });
        } else {
          toast.success("Signup successful! Please check your email to verify your account.");
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        if (data.session) {
          toast.success("Welcome back to LearnX!");
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Could not connect to Google OAuth.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-2 md:p-8">
        {/* Left: Hero image */}
        <div className="relative hidden overflow-hidden rounded-3xl md:block">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80"
            alt="Mountain landscape"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-10 left-10 text-white">
            <h2 className="font-display text-7xl leading-none">Begin your</h2>
            <h2 className="font-display italic text-7xl leading-none">Journey</h2>
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ChevronLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="text-3xl font-semibold text-foreground">
              {isSignUp ? "Create your LearnX account" : "Sign in to LearnX"}
            </h1>
            <p className="mt-2 italic text-muted-foreground">
              {isSignUp ? "Join thousands of active learners today" : "Your LearnX workspace starts here"}
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-muted px-6 py-3 text-sm font-medium hover:bg-muted/70 disabled:opacity-50 transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. andrewmaske@example.com"
                  className="mt-1 w-full rounded-lg bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Password</label>
                <div className="relative mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-muted px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-background" />
                ) : (
                  <span className="inline-block h-4 w-4 rounded-sm bg-primary" />
                )}
                {isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>

            <p className="mt-4 text-xs italic text-muted-foreground">
              By continuing, you agree to our <a className="underline cursor-pointer">Terms</a> and{" "}
              <a className="underline cursor-pointer">Privacy Policy</a>.
            </p>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-primary hover:underline focus:outline-none"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
