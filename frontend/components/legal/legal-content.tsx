import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page-shell";

export const legalUpdatedAt = "6. června 2026";
export const legalOperator = {
  name: "Martin Iš",
  address: "Zahradní 1107, 696 81 Bzenec",
  ico: "24503436",
  email: "ismartinvision@gmail.com",
} as const;

interface LegalPageShellProps {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  children: ReactNode;
}

export function LegalPageShell({
  title,
  description,
  icon: Icon,
  children,
}: LegalPageShellProps) {
  return (
    <ListPageShell className="max-w-4xl py-10 sm:py-12">
      <ListPageHeader
        title={title}
        description={description}
        icon={<Icon className="h-5 w-5 text-primary" />}
      />
      <div className="space-y-6">{children}</div>
    </ListPageShell>
  );
}

export function LegalCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-card rounded-[1.5rem] p-6 sm:p-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <div className="space-y-4 text-sm leading-7 text-[color:var(--text-normal)] sm:text-[15px]">
          {children}
        </div>
      </div>
    </section>
  );
}

export function LegalLead({ children }: { children: ReactNode }) {
  return <p className="text-base leading-7 text-foreground/90">{children}</p>;
}

export function LegalList({
  items,
}: {
  items: ReactNode[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={index}
          className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm leading-7 text-[color:var(--text-normal)]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LegalTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-[1.25rem] border border-border">
      <table className="min-w-full divide-y divide-border text-left text-sm">
        <thead className="bg-muted/70">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium text-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 align-top text-[color:var(--text-normal)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
