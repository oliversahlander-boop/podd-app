import { HTMLAttributes } from "react";
import { cn } from "./cn";
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={cn("inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--color-surface-raised)] px-3 py-1 text-xs font-bold text-zinc-300", className)} {...props} />; }
