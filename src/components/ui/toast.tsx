import { HTMLAttributes } from "react";
import { cn } from "./cn";
export function Toast({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("fixed bottom-6 right-6 z-50 max-w-sm rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] p-4 text-sm text-white shadow-2xl ring-1 ring-[var(--color-border)]", className)} role="status" {...props} />; }
