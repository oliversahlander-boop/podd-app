import { HTMLAttributes } from "react";
import { cn } from "./cn";
export function PageHeader({ className, ...props }: HTMLAttributes<HTMLElement>) { return <header className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)} {...props} />; }
