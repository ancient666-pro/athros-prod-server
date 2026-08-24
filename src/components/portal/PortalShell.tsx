import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Mail, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { mailtoHref, siteConfig, telHref } from "@/lib/site-config";

export function PortalShell({
  children,
  isAdmin,
  subtitle,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  subtitle?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck } as const] : []),
  ];

  return (
    <div className="noise relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-50" />
        <div className="absolute -top-40 right-[6%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_65%)] blur-3xl" />
      </div>

      <header className="sticky top-3 z-40 px-4">
        <nav className="glass mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-4 py-2.5 shadow-[var(--shadow-elevated)]">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary">
              <span className="h-3 w-3 rounded-[4px] bg-gradient-nv" />
            </span>
            <span className="font-display truncate text-[15px] font-semibold tracking-tight">
              Athros
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                  pathname === link.to
                    ? "bg-nv/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <link.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={handleSignOut}
              className="ml-1 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-10 pb-20">
        {subtitle ? (
          <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            {subtitle}
          </p>
        ) : null}
        {children}
      </main>

      <footer className="border-t border-border/70 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-[13px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Athros. Client portal.</span>
          <div className="flex flex-wrap items-center gap-4">
            <a className="flex items-center gap-1.5 hover:text-foreground" href={telHref}>
              <Phone className="h-3.5 w-3.5" /> {siteConfig.supportPhone}
            </a>
            <a className="flex items-center gap-1.5 hover:text-foreground" href={mailtoHref}>
              <Mail className="h-3.5 w-3.5" /> {siteConfig.supportEmail}
            </a>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
