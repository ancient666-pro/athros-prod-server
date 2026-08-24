import type { CSSProperties } from "react";
import { FrameworkLogo } from "./FrameworkLogo";
import { cn } from "@/lib/utils";

/**
 * Glassmorphic badge used by the hero orbit — brand mark + name.
 * `counterStyle` keeps the label upright while the orbit ring rotates.
 */
export function OrbitBadge({
  name,
  counterStyle,
  className,
}: {
  name: string;
  counterStyle?: CSSProperties;
  className?: string;
}) {
  return (
    <span className="block" style={counterStyle}>
      <span
        className={cn(
          "flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-border bg-card/90 px-2.5 py-1 font-mono text-[10px] font-medium tracking-tight whitespace-nowrap text-foreground shadow-[var(--shadow-elevated)] backdrop-blur",
          className,
        )}
      >
        <FrameworkLogo name={name} className="h-3 w-3" />
        {name}
      </span>
    </span>
  );
}
