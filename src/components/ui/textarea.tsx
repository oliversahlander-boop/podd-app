import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => <textarea className={cn("min-h-48 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-[15px] leading-7 text-white outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-50", className)} ref={ref} {...props} />);
Textarea.displayName = "Textarea";
