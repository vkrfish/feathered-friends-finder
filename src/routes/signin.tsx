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
  "Active recall and spaced repetition produce significantly higher retention than passive rereading.",
  "Grounding study sessions in primary sources eliminates hallucinated facts and unsupported claims.",
  "Synthesize textbooks, lecture slides, and research in a single focused workspace.",
  "Target your weakest knowledge areas with adaptive testing calibrated to memory decay curves.",
  "Spend less time organizing notes and more time practicing deliberate retrieval.",
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
    let isMounted = true;
    const checkActiveSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && isMounted) {
          navigate({ to: "/dashboard" });
        }
      } catch (err) {
        console.warn("Database connection offline, skipping session check:", err);
      }
    };
    checkActiveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isMounted) {
        navigate({ to: "/dashboard" });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-2 rounded-xl border border-border bg-card overflow-hidden shadow-2xl relative">
        {/* Left Column: Studio Insights & Value Preview */}
        <div className="relative hidden md:flex flex-col justify-between p-10 bg-secondary/30 border-r border-border overflow-hidden">
          <Link to="/" className="flex items-center gap-2.5 relative z-10 self-start">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 border border-primary/25">
              <div
                className="h-3 w-3 rotate-45 bg-primary"
                style={{ clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)" }}
              />
            </div>
            <span className="font-display text-lg font-bold text-foreground tracking-tight">LearnX</span>
          </Link>

          {/* Structured Workspace Preview Card */}
          <div className="relative my-auto py-8">
            <div className="rounded-lg border border-border bg-card/80 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  Grounded Workspace
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">3 sources indexed</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground truncate">
                  Molecular_Biochemistry_Core.pdf
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  Active recall synthesis with grounded citation markers and spaced repetition practice sets.
                </p>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  36 Active Cards
                </span>
                <span className="font-mono">100% Verified</span>
              </div>
            </div>
          </div>

          {/* Dynamic rotating research insight */}
          <div className="relative z-10 text-left min-h-[72px] flex flex-col justify-end border-t border-border/60 pt-4">
            <p className="text-xs font-medium text-foreground/80 leading-relaxed transition-all duration-300">
              "{quotes[quoteIdx]}"
            </p>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1.5 block">
              Cognitive Learning Principles
            </span>
          </div>
        </div>

        {/* Right Column: Ingest auth form */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="w-full max-w-sm mx-auto">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to home
            </Link>

            <h2 className="text-2xl font-bold text-foreground text-left tracking-tight font-display">
              {isSignUp ? "Create your workspace" : "Sign in to LearnX"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground text-left">
              {isSignUp
                ? "Enter your details to create an account and start studying."
                : "Enter your credentials to access your study notebooks."}
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-md bg-secondary/60 border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-all outline-none disabled:opacity-50"
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
              <span>Continue with Google</span>
            </button>

            <div className="my-5 flex items-center gap-3 text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5 text-left">
              <div>
                <label className="text-xs font-medium text-foreground">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="mt-1 w-full rounded-md bg-secondary/30 border border-input px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-md bg-secondary/30 border border-input px-3 py-2 text-xs text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all outline-none"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>{isSignUp ? "Create Workspace Account" : "Sign In"}</span>
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-medium text-primary hover:underline outline-none"
              >
                {isSignUp ? "Sign In" : "Register now"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
