import styles from "./Badge.module.css";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "accent";
  size?: "sm" | "md";
  dot?: boolean;
  icon?: React.ReactNode;
}

const variantColors: Record<string, { color: string; bg: string }> = {
  default: { color: "var(--text-secondary)", bg: "rgba(136, 136, 160, 0.12)" },
  success: { color: "var(--success)", bg: "var(--success-muted)" },
  warning: { color: "var(--warning)", bg: "var(--warning-muted)" },
  danger: { color: "var(--danger)", bg: "var(--danger-muted)" },
  info: { color: "var(--info)", bg: "var(--info-muted)" },
  accent: { color: "var(--accent)", bg: "var(--accent-muted)" },
};

export default function Badge({
  children,
  color,
  bg,
  variant = "default",
  size = "sm",
  dot = false,
  icon,
}: BadgeProps) {
  const vc = variantColors[variant];
  const finalColor = color || vc.color;
  const finalBg = bg || vc.bg;

  return (
    <span
      className={cn(styles.badge, styles[size])}
      style={{ color: finalColor, backgroundColor: finalBg }}
    >
      {dot && <span className={styles.dot} style={{ backgroundColor: finalColor }} />}
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
