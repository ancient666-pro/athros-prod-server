import { motion, useInView, useReducedMotion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type LenisLike = {
  destroy: () => void;
  raf: (time: number) => void;
  scrollTo: (target: string | number | HTMLElement, options?: Record<string, unknown>) => void;
};

let lenisInstance: LenisLike | null = null;

/** Smooth-scrolls to an in-page anchor with a 1200ms eased motion. */
export function scrollToSection(hash: string) {
  const id = hash.replace("#", "");
  const target = document.getElementById(id);
  if (!target) return;

  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset: -88,
      duration: 1.2,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    });
    return;
  }

  const top = target.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top, behavior: "smooth" });
}

export function useLenis() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    let cancelled = false;

    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const instance = new Lenis({
        duration: 1.2,
        lerp: 0.09,
        smoothWheel: true,
      });
      lenisInstance = instance as unknown as LenisLike;
      const raf = (time: number) => {
        instance.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenisInstance?.destroy();
      lenisInstance = null;
    };
  }, [reduce]);
}

/** Tracks which section is currently in view for nav active states. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.5, 1] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids.join(",")]);

  return active;
}

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y, filter: "blur(10px)" }}
      animate={
        inView
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y, filter: "blur(10px)" }
      }
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal
      className={cn(
        "mx-auto max-w-2xl",
        align === "center" ? "text-center" : "mx-0 text-left",
      )}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-nv" />
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl leading-[1.05] font-semibold sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </Reveal>
  );
}

type MagneticProps = ComponentPropsWithoutRef<"a"> & {
  variant?: "primary" | "ghost" | "fire";
  children: ReactNode;
};

export function MagneticButton({
  variant = "primary",
  className,
  children,
  onClick,
  ...props
}: MagneticProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();

  return (
    <a
      ref={ref}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={(event) => {
        const href = props.href;
        if (href?.startsWith("#")) {
          event.preventDefault();
          scrollToSection(href);
        }
        onClick?.(event);
      }}
      onMouseMove={(event) => {
        if (reduce || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setOffset({
          x: (event.clientX - (rect.left + rect.width / 2)) * 0.18,
          y: (event.clientY - (rect.top + rect.height / 2)) * 0.3,
        });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3.5 text-sm font-semibold transition-shadow duration-300 will-change-transform",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-[0_10px_30px_-12px_var(--nv)] hover:shadow-[0_18px_50px_-14px_var(--nv)]",
        variant === "fire" &&
          "fire-surface text-[oklch(0.18_0.03_40)] shadow-[0_14px_40px_-12px_var(--fire)] hover:shadow-[0_22px_60px_-14px_var(--fire)]",
        variant === "ghost" &&
          "border border-border bg-card/70 text-foreground backdrop-blur hover:border-nv/50",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,oklch(1_0_0/35%),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
    </a>
  );
}

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-transparent">
      <div
        className="h-full origin-left bg-gradient-nv"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
