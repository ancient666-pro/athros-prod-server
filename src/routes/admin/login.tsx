import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

const title = "Staff Sign In — Athros";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title },
      {
        name: "description",
        content: "Restricted Athros staff access to the delivery control panel.",
      },
      { property: "og:title", content: title },
      { property: "og:description", content: "Restricted Athros staff access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const { data: staff, error: roleError } = await supabase.rpc("is_staff", {
        _user_id: data.user.id,
      });
      if (roleError) throw roleError;

      if (!staff) {
        await supabase.auth.signOut();
        toast.error("This account is not an Athros staff account.");
        return;
      }

      navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="noise relative grid min-h-screen place-items-center px-5 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="absolute -top-32 right-[10%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_65%)] blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to athros.ai
        </Link>

        <div className="glass rounded-3xl border border-border p-7 shadow-[var(--shadow-float)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-[10.5px] tracking-[0.18em] text-muted-foreground uppercase">
            <ShieldCheck className="h-3 w-3" /> Restricted
          </span>
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">
            Athros staff sign in
          </h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Delivery control panel access for Athros team accounts only. Client accounts should use
            the client portal.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="admin-email">Staff email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy} className="mt-1 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in to control panel
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-5 block text-center text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            I'm a client — take me to the client portal
          </Link>
        </div>
      </div>
      <Toaster />
    </main>
  );
}
