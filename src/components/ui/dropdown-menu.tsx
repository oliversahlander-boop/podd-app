import { HTMLAttributes } from "react";
import { cn } from "./cn";
export function DropdownMenu({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("absolute z-50 min-w-48 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] p-1 text-sm shadow-2xl ring-1 ring-[var(--color-border)]", className)} role="menu" {...props} />; }
export function DropdownMenuItem({ className, ...props }: HTMLAttributes<HTMLButtonElement>) { return <button className={cn("flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left font-semibold text-zinc-300 transition hover:bg-[var(--color-surface-hover)] hover:text-white", className)} role="menuitem" {...props} />; }
