import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => <select className={cn("h-14 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 text-[15px] text-white outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-50", className)} ref={ref} {...props} />);
Select.displayName = "Select";
