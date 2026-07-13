import { HTMLAttributes } from "react";
import { cn } from "./cn";
type Tone = "neutral" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = { neutral: "bg-zinc-800 text-zinc-300", success: "bg-green-500/15 text-green-300", warning: "bg-yellow-500/15 text-yellow-300", danger: "bg-red-500/15 text-red-300" };
export function StatusBadge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) { return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", tones[tone], className)} {...props} />; }
