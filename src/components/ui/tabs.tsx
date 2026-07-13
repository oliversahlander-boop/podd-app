import { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "./cn";
export function Tabs({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] p-1", className)} {...props} />; }
export function Tab({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) { return <button className={cn("rounded-[var(--radius-sm)] px-4 py-2 text-sm font-bold transition", active ? "bg-[var(--color-primary)] text-black" : "text-zinc-400 hover:text-white", className)} {...props} />; }
