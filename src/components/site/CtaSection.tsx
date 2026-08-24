import { ArrowUpRight, Rocket } from "lucide-react";
import { MagneticButton, Reveal } from "./primitives";
import { useLeadModal } from "./lead-modal-context";

const PHONE = "+13154820199";
const BOOKING_URL =
  import.meta.env.VITE_BOOKING_URL ?? "https://calendly.com/athros/discovery-call";

export function CtaSection() {
  const { openModal } = useLeadModal();

  const handleDiscoveryCall = () => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    if (isMobile) {
      window.location.href = `tel:${PHONE}`;
      return;
    }
    window.open(BOOKING_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="contact" className="relative px-5 py-24 sm:py-32">
      <Reveal>
        <div className="noise relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-border bg-[oklch(0.16_0.01_260)] px-6 py-20 text-center shadow-[var(--shadow-float)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,oklch(1_0_0/40%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/40%)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent_75%)]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--nv),transparent_65%)] opacity-30 blur-3xl" />
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="pointer-events-none absolute h-1 w-1 rounded-full bg-[oklch(0.9_0.2_128/70%)]"
              style={{
                left: `${(index * 41) % 96}%`,
                top: `${(index * 53) % 90}%`,
                animation: `float-y ${5 + (index % 5)}s ease-in-out ${index * 0.25}s infinite`,
              }}
            />
          ))}

          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl leading-[1.05] font-semibold text-[oklch(0.99_0_0)] sm:text-5xl">
              Ready to build the next{" "}
              <span className="text-gradient-bright">
                billion-dollar app?
              </span>
            </h2>
            <p className="mt-4 text-[15px] text-[oklch(0.82_0.01_260)]">
              From idea to production in days — not months.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <MagneticButton
                href="#contact"
                onClick={(event) => {
                  event.preventDefault();
                  openModal();
                }}
                className="bg-gradient-nv text-[oklch(0.18_0.03_130)]"
              >
                <Rocket className="h-4 w-4" />
                Unleash Your Empire
              </MagneticButton>
              <MagneticButton
                href={BOOKING_URL}
                onClick={(event) => {
                  event.preventDefault();
                  handleDiscoveryCall();
                }}
                variant="ghost"
                className="border-[oklch(1_0_0/18%)] bg-[oklch(1_0_0/8%)] text-[oklch(0.98_0_0)]"
              >
                Book a Discovery Call
                <ArrowUpRight className="h-4 w-4" />
              </MagneticButton>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
