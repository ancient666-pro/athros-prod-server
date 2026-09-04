import { useEffect, useState } from "react";
import { Menu, MoonStar, Sun, X, ArrowRight } from "lucide-react";
import { MagneticButton, scrollToSection, useActiveSection } from "./primitives";
import { cn } from "@/lib/utils";

const links = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "Command Center", href: "#command-center" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" },
];

const sectionIds = links.map((link) => link.href.slice(1));

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const active = useActiveSection(sectionIds);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4">
      <nav
        aria-label="Main"
        className={cn(
          "glass mx-auto flex max-w-6xl items-center justify-between rounded-full transition-all duration-500",
          scrolled
            ? "h-14 max-w-5xl px-4 shadow-[var(--shadow-elevated)]"
            : "h-16 px-5 shadow-none",
        )}
      >
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("#home");
          }}
          className="flex min-w-0 items-center gap-2.5"
        >
          <img src="/logo.png" alt="Athros Logo" className="h-8 w-8 object-contain dark:invert" />
          <span className="font-display truncate text-[15px] font-semibold tracking-tight">
            Athros
          </span>
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection(link.href);
                }}
                aria-current={active === link.href.slice(1) ? "true" : undefined}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  active === link.href.slice(1)
                    ? "bg-secondary/70 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={() => setDark((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </button>
          <MagneticButton
            href="#pricing"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("#pricing");
            }}
            shimmer
            className="hidden px-5 py-2.5 text-[13px] sm:inline-flex bg-gradient-nv text-[oklch(0.18_0.03_130)] shadow-[0_4px_20px_-4px_var(--nv)] hover:shadow-[0_8px_30px_-4px_var(--nv)] font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:ring-nv focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Book Project
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </MagneticButton>
          <MagneticButton href="/login" className="hidden px-5 py-2.5 text-[13px] sm:inline-flex">
            Sign In
          </MagneticButton>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="glass mx-auto mt-2 max-w-6xl rounded-3xl p-3 lg:hidden">
          <ul className="grid gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(event) => {
                    event.preventDefault();
                    setOpen(false);
                    scrollToSection(link.href);
                  }}
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-sm font-medium hover:bg-secondary hover:text-foreground",
                    active === link.href.slice(1)
                      ? "bg-secondary/70 text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#pricing"
                onClick={(event) => {
                  event.preventDefault();
                  setOpen(false);
                  scrollToSection("#pricing");
                }}
                className="relative mt-1 block overflow-hidden rounded-2xl bg-gradient-nv px-4 py-3 text-center text-sm font-semibold text-[oklch(0.18_0.03_130)] shadow-[0_4px_20px_-4px_var(--nv)] transition-transform active:scale-[0.98]"
              >
                Book Project
                <span className="pointer-events-none absolute inset-y-0 w-full bg-[linear-gradient(100deg,transparent_0%,oklch(1_0_0/40%)_50%,transparent_100%)] animate-shimmer" />
              </a>
            </li>
            <li>
              <a
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 block rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
              >
                Sign In
              </a>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}
