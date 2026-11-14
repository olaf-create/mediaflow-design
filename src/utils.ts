import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and resolves conflicting Tailwind classes (used by Beautiful UI components). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
