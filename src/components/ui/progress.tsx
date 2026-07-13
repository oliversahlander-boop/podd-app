import { HTMLAttributes } from "react";
import { cn } from "./cn";
export function Progress({ className, value, ...props }: HTMLAttributes<HTMLDivElement> & { value: number }) { return <div className={cn("h-2 overflow-hidden rounded-full bg-zinc-800", className)} {...props}><div className="h-full rounded-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
