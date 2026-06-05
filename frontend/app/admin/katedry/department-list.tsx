"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { FACULTIES } from "@/lib/faculties";
import type { Department } from "@/lib/types/database";
import { createDepartment, deleteDepartment, updateDepartment } from "./actions";

type DepartmentWithUsage = Department & {
  subject_count: number;
  teacher_count: number;
};

function DepartmentFormDialog({
  trigger,
  department,
}: {
  trigger: React.ReactNode;
  department?: DepartmentWithUsage;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: department?.name ?? "",
    faculty: department?.faculty ?? FACULTIES[0].value,
  });

  const isEditing = Boolean(department);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (isEditing && !department) {
        setError("Chybí katedra k úpravě.");
        return;
      }

      const result = isEditing
        ? await updateDepartment(department!.id, formData)
        : await createDepartment(formData);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {trigger}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing ? "Upravit katedru" : "Přidat katedru"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isEditing ? "Změň název nebo fakultu." : "Vytvoř novou katedru pro správu předmětů a vyučujících."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="department-name" className="text-sm font-medium text-foreground">
                  Název katedry
                </label>
                <input
                  id="department-name"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  placeholder="např. Katedra informatiky"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="department-faculty" className="text-sm font-medium text-foreground">
                  Fakulta
                </label>
                <select
                  id="department-faculty"
                  value={formData.faculty}
                  onChange={(event) => setFormData((current) => ({ ...current, faculty: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                >
                  {FACULTIES.map((faculty) => (
                    <option key={faculty.value} value={faculty.value}>
                      {faculty.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEditing ? "Uložit změny" : "Přidat katedru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DepartmentList({ initialDepartments }: { initialDepartments: DepartmentWithUsage[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredDepartments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return initialDepartments;

    return initialDepartments.filter((department) =>
      [department.name, department.faculty, department.slug].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [initialDepartments, search]);

  const handleDelete = (department: DepartmentWithUsage) => {
    if (!window.confirm(`Opravdu chcete smazat katedru ${department.name}?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDepartment(department.id);
      if ("error" in result && result.error) {
        window.alert(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Hledat katedru nebo fakultu..."
          className="w-full max-w-md rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
        />

        <DepartmentFormDialog
          trigger={
            <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" />
              Přidat katedru
            </span>
          }
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-foreground">Katedra</th>
              <th className="px-4 py-3 font-semibold text-foreground hidden md:table-cell">Fakulta</th>
              <th className="px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Využití</th>
              <th className="px-4 py-3 font-semibold text-foreground text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Žádné katedry nebyly nalezeny.
                </td>
              </tr>
            ) : (
              filteredDepartments.map((department) => (
                <tr key={department.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{department.name}</div>
                      <div className="text-xs text-muted-foreground">{department.slug}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{department.faculty}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {department.subject_count} předmětů · {department.teacher_count} vyučujících
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <DepartmentFormDialog
                        department={department}
                        trigger={
                          <span className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                            <Edit2 className="h-4 w-4" />
                          </span>
                        }
                      />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(department)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Smazat"
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
