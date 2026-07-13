import { HTMLAttributes } from "react";
import { cn } from "./cn";
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("animate-pulse rounded-[var(--radius-md)] bg-zinc-800", className)} aria-hidden="true" {...props} />; }
