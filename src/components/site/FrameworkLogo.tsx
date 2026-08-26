import {
  siAndroid,
  siAnthropic,
  siAppstore,
  siApple,
  siBitbucket,
  siClaude,
  siDocker,
  siFigma,
  siFirebase,
  siFlutter,
  siGit,
  siGithub,
  siGitlab,
  siGooglecloud,
  siGooglegemini,
  siGooglemaps,
  siGoogleplay,
  siJira,
  siKotlin,
  siKubernetes,
  siLinear,
  siMongodb,
  siNestjs,
  siNodedotjs,
  siPostgresql,
  siRazorpay,
  siReact,
  siRedis,
  siSentry,
  siStripe,
  siSupabase,
  siSwift,
} from "simple-icons";
import { Cloud, Coffee, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoEntry = {
  path?: string;
  hex: string;
  fallback?: LucideIcon;
};

/** Single source of truth for brand marks used in the orbit + marquee. */
export const frameworkLogos: Record<string, LogoEntry> = {
  Kotlin: { path: siKotlin.path, hex: `#${siKotlin.hex}` },
  Swift: { path: siSwift.path, hex: `#${siSwift.hex}` },
  Flutter: { path: siFlutter.path, hex: `#${siFlutter.hex}` },
  "React Native": { path: siReact.path, hex: `#${siReact.hex}` },
  React: { path: siReact.path, hex: `#${siReact.hex}` },
  Android: { path: siAndroid.path, hex: `#${siAndroid.hex}` },
  iOS: { path: siApple.path, hex: "#6E6E73" },
  Apple: { path: siApple.path, hex: "#6E6E73" },
  Firebase: { path: siFirebase.path, hex: `#${siFirebase.hex}` },
  Supabase: { path: siSupabase.path, hex: `#${siSupabase.hex}` },
  PostgreSQL: { path: siPostgresql.path, hex: `#${siPostgresql.hex}` },
  "Node.js": { path: siNodedotjs.path, hex: `#${siNodedotjs.hex}` },
  Node: { path: siNodedotjs.path, hex: `#${siNodedotjs.hex}` },
  NestJS: { path: siNestjs.path, hex: `#${siNestjs.hex}` },
  Docker: { path: siDocker.path, hex: `#${siDocker.hex}` },
  Kubernetes: { path: siKubernetes.path, hex: `#${siKubernetes.hex}` },
  Redis: { path: siRedis.path, hex: `#${siRedis.hex}` },
  MongoDB: { path: siMongodb.path, hex: `#${siMongodb.hex}` },
  Sentry: { path: siSentry.path, hex: `#${siSentry.hex}` },
  GitHub: { path: siGithub.path, hex: `#${siGithub.hex}` },
  GitLab: { path: siGitlab.path, hex: `#${siGitlab.hex}` },
  Bitbucket: { path: siBitbucket.path, hex: `#${siBitbucket.hex}` },
  Git: { path: siGit.path, hex: `#${siGit.hex}` },
  Claude: { path: siClaude.path, hex: `#${siClaude.hex}` },
  Anthropic: { path: siAnthropic.path, hex: "#B0AEA6" },
  Gemini: { path: siGooglegemini.path, hex: `#${siGooglegemini.hex}` },
  Stripe: { path: siStripe.path, hex: `#${siStripe.hex}` },
  Razorpay: { path: siRazorpay.path, hex: "#3395FF" },
  "Google Maps": { path: siGooglemaps.path, hex: `#${siGooglemaps.hex}` },
  GCP: { path: siGooglecloud.path, hex: `#${siGooglecloud.hex}` },
  "Play Store": { path: siGoogleplay.path, hex: "#00C853" },
  "App Store": { path: siAppstore.path, hex: `#${siAppstore.hex}` },
  Figma: { path: siFigma.path, hex: `#${siFigma.hex}` },
  Linear: { path: siLinear.path, hex: `#${siLinear.hex}` },
  Jira: { path: siJira.path, hex: `#${siJira.hex}` },
  // Brands without a redistributable mark fall back to a neutral glyph.
  OpenAI: { hex: "#10A37F", fallback: Sparkles },
  ChatGPT: { hex: "#10A37F", fallback: Sparkles },
  Java: { hex: "#E76F00", fallback: Coffee },
  AWS: { hex: "#FF9900", fallback: Cloud },
  Azure: { hex: "#0078D4", fallback: Cloud },
  "CI/CD": { hex: "#2088FF", fallback: Rocket },
  Deploy: { hex: "#2088FF", fallback: Rocket },
};

export function FrameworkLogo({ name, className }: { name: string; className?: string }) {
  const entry = frameworkLogos[name];

  if (!entry) {
    return <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full bg-nv", className)} />;
  }

  if (!entry.path && entry.fallback) {
    const Fallback = entry.fallback;
    return (
      <Fallback
        aria-hidden="true"
        className={cn("h-3.5 w-3.5 shrink-0", className)}
        style={{ color: entry.hex }}
      />
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      role="presentation"
      className={cn("h-3.5 w-3.5 shrink-0", className)}
      fill={entry.hex}
    >
      <path d={entry.path!} />
    </svg>
  );
}
