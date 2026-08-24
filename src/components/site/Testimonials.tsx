import { Star } from "lucide-react";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";
import { Reveal, SectionHeading } from "./primitives";

const testimonials = [
  {
    quote:
      "Our MVP was delivered in under two days. Investors genuinely thought we had a six-month engineering team behind it.",
    name: "Arjun Mehta",
    role: "Founder, Zeptaly",
    avatar: avatar1,
  },
  {
    quote:
      "They handled architecture, deployment, QA, Play Store publishing, and backend. We only focused on our business.",
    name: "Nadia Okafor",
    role: "CEO, Fieldloop",
    avatar: avatar2,
  },
  {
    quote:
      "The production package paid for itself within weeks. Fastest engineering team we've ever worked with.",
    name: "Wei Chen",
    role: "CTO, Northwind Labs",
    avatar: avatar3,
  },
  {
    quote:
      "Our enterprise migration happened without downtime. Incredible execution and constant communication.",
    name: "Elin Sandberg",
    role: "Product Manager, Halden Group",
    avatar: avatar4,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Testimonials"
          title="Trusted by founders who ship"
          subtitle="Real outcomes from teams that needed velocity without sacrificing engineering quality."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {testimonials.map((item, index) => (
            <Reveal key={item.name} delay={index * 0.06}>
              <figure className="glass-card h-full p-7 transition-transform duration-500 hover:-translate-y-1">
                <div className="relative z-10">
                  <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star
                        key={star}
                        className="h-3.5 w-3.5 fill-[var(--fire-amber)] text-[var(--fire-amber)]"
                      />
                    ))}
                  </div>
                  <blockquote className="font-display mt-4 text-[17px] leading-snug font-medium tracking-tight">
                    “{item.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex min-w-0 items-center gap-3">
                    <img
                      src={item.avatar}
                      alt={item.name}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold">
                        {item.name}
                      </span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {item.role}
                      </span>
                    </span>
                  </figcaption>
                </div>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
