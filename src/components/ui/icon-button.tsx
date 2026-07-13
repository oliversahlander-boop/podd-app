import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";
export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => <button className={cn("inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-zinc-400 transition hover:bg-[var(--color-surface-hover)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50", className)} ref={ref} {...props} />);
IconButton.displayName = "IconButton";
