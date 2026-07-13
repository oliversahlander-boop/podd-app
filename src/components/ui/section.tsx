import { HTMLAttributes } from "react";
import { cn } from "./cn";
export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) { return <section className={cn("mb-6", className)} {...props} />; }
