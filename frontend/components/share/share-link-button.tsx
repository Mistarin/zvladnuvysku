"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { getSitePathUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type ShareLinkButtonProps = {
  path: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconClassName?: string;
  title?: string;
};

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard není dostupná.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ShareLinkButton({
  path,
  label = "Sdílet",
  copiedLabel = "Zkopírováno",
  className,
  iconClassName,
  title,
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleClick = async () => {
    if (isPending) return;

    setIsPending(true);

    try {
      await copyText(getSitePathUrl(path));
      setCopied(true);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 1800);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={title ?? label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60 sm:text-sm",
        className,
      )}
    >
      {copied ? (
        <Check className={cn("size-3.5", iconClassName)} />
      ) : (
        <Copy className={cn("size-3.5", iconClassName)} />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
