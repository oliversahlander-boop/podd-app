import { LabelHTMLAttributes } from "react";
import { cn } from "./cn";
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) { return <label className={cn("grid gap-2 text-[13px] font-semibold text-[var(--color-text-secondary)]", className)} {...props} />; }
