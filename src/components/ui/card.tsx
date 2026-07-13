import { HTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";
type Variant = "default" | "subtle" | "elevated" | "danger";
const variants: Record<Variant, string> = { default: "bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]", subtle: "bg-[var(--color-surface-raised)]", elevated: "bg-[var(--color-surface)] shadow-[var(--product-shadow)] ring-1 ring-[var(--color-border)]", danger: "bg-red-950/20 ring-1 ring-red-900" };
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { variant?: Variant }>(({ className, variant = "default", ...props }, ref) => <div className={cn("rounded-[var(--radius-lg)] p-8", variants[variant], className)} ref={ref} {...props} />);
Card.displayName = "Card";
