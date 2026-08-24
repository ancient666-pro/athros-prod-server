import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mailtoHref, siteConfig } from "@/lib/site-config";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

const title = "Client Portal Sign In — Athros";
const description =
  "Sign in to the Athros Command Center to track sprint progress, builds, issues, invoices and delivery for your app project.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientLoginPage,
});

function ClientLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [sentReset, setSentReset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentReset(true);
        toast.success("Reset link sent. Check your inbox.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="noise relative grid min-h-screen place-items-center px-5 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-[10%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_65%)] blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to athros.ai
        </Link>

        <div className="glass rounded-3xl border border-border p-7 shadow-[var(--shadow-float)]">
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Athros command center
          </p>
          <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in to your project" : "Reset your password"}
          </h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            {mode === "signin"
              ? "Accounts are created by your Athros delivery lead after your reservation is confirmed. Log in with the credentials emailed to you to follow your project live."
              : "Enter your work email and we'll send a secure reset link."}
          </p>

          {mode === "signin" ? (
            <ul className="mt-5 grid gap-2 text-[13px] text-muted-foreground">
              {[
                "Live sprint progress and milestone timeline",
                "Build & APK delivery with secure unlocks",
                "Issues, invoices and payment status",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nv" />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}

          {sentReset ? (
            <p className="mt-6 rounded-2xl border border-nv/40 bg-nv/10 p-4 text-[13.5px]">
              We sent a reset link to <strong>{email}</strong>. It expires in 60 minutes.
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {mode === "signin" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            ) : null}

            <Button type="submit" disabled={busy} className="mt-1 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Send reset link"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-5 w-full text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSentReset(false);
              setMode(mode === "signin" ? "forgot" : "signin");
            }}
          >
            {mode === "signin" ? "Forgot your password?" : "Back to sign in"}
          </button>

          <p className="mt-4 text-center text-[12px] text-muted-foreground">
            No account yet? Accounts are issued after project approval — email{" "}
            <a className="underline hover:text-foreground" href={mailtoHref}>
              {siteConfig.supportEmail}
            </a>
          </p>

          <Link
            to="/admin/login"
            className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Athros staff sign in
          </Link>
        </div>
      </div>
      <Toaster />
    </main>
  );
}
