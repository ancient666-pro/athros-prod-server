import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { OrbitBadge } from "./OrbitBadge";

/**
 * Deterministic orbital system.
 * - Positions come purely from polar coordinates (fixed radius, fixed start angle).
 * - Rotation runs as a compositor-only CSS transform animation, so it is entirely
 *   independent of scroll position (no scroll listeners, no springs, no lag).
 */
type Ring = {
  /** radius in px, relative to the 520px design container */
  radius: number;
  /** angular velocity in rad/sec */
  omega: number;
  direction: 1 | -1;
  /** phase offset so rings never align into visual collisions */
  offset: number;
  nodes: string[];
};

const RINGS: Ring[] = [
  {
    radius: 140,
    omega: 0.5,
    direction: 1,
    offset: 0,
    nodes: ["Kotlin", "Swift", "Flutter"],
  },
  {
    radius: 192,
    omega: 0.36,
    direction: -1,
    offset: Math.PI / 5,
    nodes: ["Firebase", "Git", "React Native", "Android"],
  },
  {
    radius: 240,
    omega: 0.26,
    direction: 1,
    offset: Math.PI / 7,
    nodes: ["ChatGPT", "PostgreSQL", "Supabase", "iOS"],
  },
];

const particles = Array.from({ length: 26 }, (_, index) => ({
  id: index,
  left: (index * 37) % 100,
  top: (index * 61) % 100,
  delay: (index % 9) * 0.45,
  size: index % 3 === 0 ? 3 : 2,
}));

/** desktop = 3 rings, tablet = 2, mobile = 2 with fewer chips */
function useOrbitLayout() {
  const [layout, setLayout] = useState<"desktop" | "tablet" | "mobile">("desktop");

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setLayout(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return layout;
}

function ringsFor(layout: "desktop" | "tablet" | "mobile"): Ring[] {
  if (layout === "desktop") return RINGS;
  if (layout === "tablet") return [RINGS[0]!, RINGS[1]!];
  return [
    { ...RINGS[0]!, nodes: RINGS[0]!.nodes.slice(0, 3) },
    { ...RINGS[1]!, radius: 200, nodes: ["Firebase", "React Native", "ChatGPT"] },
  ];
}

export function AICore() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const layout = useOrbitLayout();
  useEffect(() => setMounted(true), []);

  const rings = ringsFor(layout);

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-[520px] scale-[0.62] sm:scale-[0.8] lg:scale-100"
    >
      {!mounted ? null : (
        <div className="absolute inset-0">
          <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--nv-soft),transparent_65%)] blur-2xl" />

          {particles.map((particle) => (
            <span
              key={particle.id}
              className="absolute rounded-full bg-nv/50 will-change-transform"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: particle.size,
                height: particle.size,
                animation: reduce
                  ? undefined
                  : `float-y ${6 + (particle.id % 5)}s ease-in-out ${particle.delay}s infinite`,
              }}
            />
          ))}

          {rings.map((ring, ringIndex) => {
            const period = (2 * Math.PI) / ring.omega;
            const spin = reduce
              ? undefined
              : `spin-slow ${period.toFixed(2)}s linear ${ring.direction === 1 ? "normal" : "reverse"} infinite`;
            const counterSpin = reduce
              ? undefined
              : `spin-slow ${period.toFixed(2)}s linear ${ring.direction === 1 ? "reverse" : "normal"} infinite`;

            return (
              <div
                key={ring.radius}
                className="absolute top-1/2 left-1/2 rounded-full border border-border/70 will-change-transform"
                style={{
                  width: ring.radius * 2,
                  height: ring.radius * 2,
                  marginLeft: -ring.radius,
                  marginTop: -ring.radius,
                  zIndex: 10 - ringIndex,
                  animation: spin,
                }}
              >
                {ring.nodes.map((node, nodeIndex) => {
                  const angle = (nodeIndex / ring.nodes.length) * Math.PI * 2 + ring.offset;
                  return (
                    <span
                      key={node}
                      className="absolute block"
                      style={{
                        left: `${(50 + Math.cos(angle) * 50).toFixed(3)}%`,
                        top: `${(50 + Math.sin(angle) * 50).toFixed(3)}%`,
                      }}
                    >
                      <OrbitBadge name={node} counterStyle={{ animation: counterSpin }} />
                    </span>
                  );
                })}
              </div>
            );
          })}

          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ zIndex: 20 }}
          >
            <div className="relative grid h-32 w-32 place-items-center">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-nv opacity-25 blur-2xl" />
              <div className="noise relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-nv/40 bg-[radial-gradient(circle_at_30%_25%,oklch(1_0_0/90%),var(--nv-soft)_55%,var(--nv)_100%)] shadow-[0_20px_60px_-20px_var(--nv)]">
                <span className="font-display text-[11px] font-semibold tracking-[0.2em] text-[oklch(0.2_0.03_130)] uppercase">
                  AI Core
                </span>
              </div>
              {!reduce ? (
                <div className="absolute -inset-4 rounded-full border border-nv/25 [animation:spin-slow_14s_linear_infinite] border-t-nv/80 will-change-transform" />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
