import { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
export function Dialog({ children, className, open }: { children: ReactNode; className?: string; open: boolean }) { if (!open) return null; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation"><div aria-modal="true" className={cn("max-h-[90vh] w-full max-w-lg overflow-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-8 shadow-2xl ring-1 ring-[var(--color-border)]", className)} role="dialog">{children}</div></div>; }
export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h2 className={cn("text-2xl font-semibold text-white", className)} {...props} />; }
