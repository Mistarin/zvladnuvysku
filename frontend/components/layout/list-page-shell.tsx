import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListPageShellProps {
  children: ReactNode;
  className?: string;
}

interface ListPageHeaderProps {
  title: string;
  description: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ListPageShell({ children, className }: ListPageShellProps) {
  return <main className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8", className)}>{children}</main>;
}

export function ListPageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: ListPageHeaderProps) {
  return (
    <header className={cn("mb-7 flex flex-col gap-4 sm:mb-8 sm:gap-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            {icon ? (
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              <p className="max-w-[65ch] text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
            </div>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
