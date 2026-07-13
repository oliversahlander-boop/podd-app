import { ImgHTMLAttributes } from "react";
import { cn } from "./cn";
/* eslint-disable @next/next/no-img-element -- Avatar supports authenticated and signed runtime URLs. */
export function Avatar({ className, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) { return <img alt={alt} className={cn("size-10 rounded-full bg-zinc-800 object-cover ring-1 ring-zinc-700", className)} {...props} />; }
