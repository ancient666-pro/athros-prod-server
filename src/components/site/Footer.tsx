import { ArrowUp, Github, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";

const quickLinks = [
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "Process", href: "#process" },
  { label: "Blog", href: "#" },
  { label: "Case Studies", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

const socials = [
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "GitHub", href: "#", icon: Github },
  { label: "X", href: "#", icon: Twitter },
  { label: "Instagram", href: "#", icon: Instagram },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-10 md:grid-cols-[1.4fr_0.8fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Athros Logo"
                className="h-8 w-8 object-contain dark:invert"
              />
              <span className="font-display text-[15px] font-semibold">Athros</span>
            </div>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
              AI-native app development studio building production-ready Android and iOS products
              for founders who move fast.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-nv/50 hover:text-foreground"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Quick links">
            <h3 className="text-[13px] font-semibold">Quick Links</h3>
            <ul className="mt-4 grid gap-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-[13px] font-semibold">Contact</h3>
            <ul className="mt-4 grid gap-2.5 text-[13.5px] text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <a href="mailto:build@athros.dev" className="hover:text-foreground">
                  build@athros.dev
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <a href="tel:+918454094362" className="hover:text-foreground">
                  +91 8454094362
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Altamount Road, Mumbai, IN</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold">Newsletter</h3>
            <p className="mt-4 text-[13.5px] text-muted-foreground">
              Engineering notes on shipping native apps fast. Once a month.
            </p>
            <form className="mt-4 flex gap-2" onSubmit={(event) => event.preventDefault()}>
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="you@company.com"
                className="min-w-0 flex-1 rounded-full border border-border bg-card/70 px-4 py-2.5 text-[13px] outline-none focus:border-nv/60"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border pt-6 sm:flex sm:justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            © {new Date().getFullYear()} Athros. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted-foreground">
            <a href="#" className="hover:text-foreground">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
            <a href="#" className="hover:text-foreground">
              Cookies
            </a>
            <a
              href="#home"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 hover:text-foreground"
            >
              <ArrowUp className="h-3.5 w-3.5" /> Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
