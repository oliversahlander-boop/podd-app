import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "small" | "medium" | "large";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; size?: Size; variant?: Variant };
const variants: Record<Variant, string> = { primary: "bg-[var(--color-primary)] text-black hover:bg-[var(--color-primary-hover)]", secondary: "bg-[var(--color-surface-raised)] text-zinc-100 ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)]", ghost: "bg-transparent text-zinc-300 hover:bg-[var(--color-surface-raised)]", danger: "bg-red-500 text-white hover:bg-red-400" };
const sizes: Record<Size, string> = { small: "h-8 px-3 text-xs", medium: "h-12 px-4 text-sm", large: "h-14 px-6 text-sm" };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, disabled, loading, size = "medium", variant = "secondary", children, ...props }, ref) => <button className={cn("inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className)} disabled={disabled || loading} ref={ref} {...props}>{loading ? <Loader2 className="animate-spin" size={16} /> : null}{children}</button>);
Button.displayName = "Button";
