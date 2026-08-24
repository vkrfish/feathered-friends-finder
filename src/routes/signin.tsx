import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ChevronLeft, Loader2, Sparkles, MessageSquare, ShieldCheck } from "lucide-react";
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

const quotes = [
  "If you can't memorize the syllabus, let our AI do it. No cap.",
  "Swapping 2 A.M. library panic for a solid 8 hours of sleep.",
  "Built for students who are 99% caffeine and 1% hope.",
  "Because ChatGPT hallucinated your entire biology midterm.",
  "Study like a god. Even if you started 4 hours before the exam.",
];

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);

  // Rotate quotes every 4 seconds for an interactive feel
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Check if session is already active; if so, redirect immediately
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          navigate({ to: "/dashboard" });
        }
      } catch (err) {
        console.warn("Database connection offline, skipping session check:", err);
      }
    };
    checkActiveSession();
  }, [navigate]);

  const handleAuthError = (err: unknown, defaultMsg: string) => {
    console.error("Auth error details:", err);
    const errMsg = err instanceof Error ? err.message : String(err);

    // Detect if Supabase is offline/paused (typical FetchError / Failed to Fetch / 521)
    const isNetworkError =
      errMsg.toLowerCase().includes("failed to fetch") ||
      errMsg.toLowerCase().includes("network") ||
      errMsg.toLowerCase().includes("fetch") ||
      errMsg.toLowerCase().includes("521") ||
      errMsg.toLowerCase().includes("server is down");

    if (isNetworkError) {
      toast.error(
        "Database connection failed (Error 521). Your Supabase project 'peafnjhrzfetfwlksysq' is currently PAUSED. Please log in to your Supabase Dashboard (https://supabase.com/dashboard) and click 'Restore Project' to wake it up.",
        { duration: 15000 },
      );
    } else {
      toast.error(errMsg || defaultMsg);
    }
  };

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
            },
          },
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
    } catch (err) {
      handleAuthError(err, "An authentication error occurred.");
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
        },
      });
      if (error) throw error;
    } catch (err) {
      handleAuthError(err, "Could not connect to Google OAuth.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex items-center justify-center p-4">
      {/* Visual background elements */}
      <div className="absolute top-0 right-0 h-[400px] w-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[300px] w-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-white/10 bg-[#0d0e12] overflow-hidden shadow-2xl relative">
        {/* Left Column: Visual panel with dynamic quote */}
        <div className="relative hidden md:flex flex-col justify-between p-10 bg-[#090a0d] border-r border-white/5 overflow-hidden">
          {/* Animated decorative grid lines */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <Link to="/" className="flex items-center gap-2 relative z-10 self-start">
            <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/20 border border-primary/30">
              <div
                className="h-3 w-3 rotate-45 bg-primary"
                style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
              />
            </div>
            <span className="font-display text-lg font-bold text-white tracking-tight">LearnX</span>
          </Link>

          {/* Center glowing orb mockup */}
          <div className="relative my-auto py-12 flex flex-col items-center">
            <div className="absolute w-48 h-48 rounded-full bg-primary/10 blur-3xl animate-pulse" />
            <div className="relative w-36 h-36 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent border border-primary/20 flex flex-col justify-around p-4 shadow-xl backdrop-blur-md">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-mono text-primary font-semibold uppercase tracking-wider">
                  Indexed Database
                </span>
                <p className="text-xs font-semibold text-white/90 truncate">
                  Biology_midterm_cram.pdf
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic rotating student quotes */}
          <div className="relative z-10 text-left min-h-[80px] flex flex-col justify-end">
            <p className="text-sm font-medium text-white/80 leading-relaxed transition-all duration-500 ease-in-out">
              "{quotes[quoteIdx]}"
            </p>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-2 block">
              — Night Before Exams
            </span>
          </div>
        </div>

        {/* Right Column: Ingest auth form */}
        <div className="flex flex-col justify-center p-8 md:p-12">
          <div className="w-full max-w-sm mx-auto">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-1 text-xs text-primary hover:underline self-start"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to home
            </Link>

            <h2 className="text-2xl font-bold text-white text-left tracking-tight">
              {isSignUp ? "Create your workspace" : "Welcome back, crammer"}
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground text-left italic">
              {isSignUp
                ? "Join thousands of students saving their GPA"
                : "Your study database starts here"}
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-white/5 border border-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all outline-none"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
              Google
            </button>

            <div className="my-6 flex items-center gap-3 text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
              <div className="h-px flex-1 bg-white/5" /> or{" "}
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-white/80">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="mt-1.5 w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/80">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/20"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50 transition-all outline-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isSignUp ? "Register account" : "Log in"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Need to save your grades?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-primary hover:underline outline-none focus:outline-none"
              >
                {isSignUp ? "Sign In" : "Register Now"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
