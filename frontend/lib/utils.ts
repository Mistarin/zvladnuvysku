import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** České skloňování kreditů: 1 kredit, 2–4 kredity, 5+ kreditů */
export function formatCredits(n: number): string {
  if (n === 1) return "1 kredit"
  if (n >= 2 && n <= 4) return `${n} kredity`
  return `${n} kreditů`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
