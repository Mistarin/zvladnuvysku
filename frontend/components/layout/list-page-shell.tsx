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
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function ListPageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: ListPageHeaderProps) {
  return (
    <div className={cn("mb-10 flex flex-col gap-5 sm:gap-6", className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            {icon ? (
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card/80">
                {icon}
              </div>
            ) : null}
            <div className="min-w-0 space-y-2">
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
              <div className="h-1 w-18 rounded-full bg-primary/85" />
            </div>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
