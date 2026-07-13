import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input className={cn("h-14 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-[15px] text-white outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-50", className)} ref={ref} {...props} />);
Input.displayName = "Input";
