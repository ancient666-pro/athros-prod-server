import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

const title = "Set a New Password — Athros";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title },
      {
        name: "description",
        content: "Choose a new password for your Athros command center account.",
      },
      { property: "og:title", content: title },
      { property: "og:description", content: "Choose a new password for your Athros account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session) || isRecovery);
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Signing you in…");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="noise relative grid min-h-screen place-items-center px-5 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-60" />
      </div>

      <div className="glass w-full max-w-md rounded-3xl border border-border p-7 shadow-[var(--shadow-float)]">
        <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          Athros command center
        </p>
        <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>

        {ready ? (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy} className="mt-1 w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-[13.5px] text-muted-foreground">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
        )}
      </div>
      <Toaster />
    </main>
  );
}
