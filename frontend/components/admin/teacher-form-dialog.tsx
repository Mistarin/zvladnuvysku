"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTeacher, updateTeacher } from "@/app/admin/ucitele/actions";
import { normalizeDepartmentName } from "@/lib/department-name";
import { filterDepartmentsByFaculty, sortDepartments, type DepartmentOption } from "@/lib/departments";
import { FACULTIES } from "@/lib/faculties";
import { generateTeacherSlug } from "@/lib/teacher-slug";
import type { Teacher } from "@/lib/types/database";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, ChevronDown } from "lucide-react";

interface TeacherFormDialogProps {
  teacher?: Teacher;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  departments?: DepartmentOption[];
}

export function TeacherFormDialog({
  teacher,
  trigger,
  open,
  onOpenChange,
  departments = [],
}: TeacherFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  // Local controlled state if not controlled by parent
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const isEditing = !!teacher;

  const [formData, setFormData] = useState({
    name: teacher?.name || "",
    slug: teacher?.slug || "",
    faculty: teacher?.faculty || FACULTIES[0].value,
    department: teacher?.department || "",
    department_id: teacher?.department_id || "",
  });
  const availableDepartments = sortDepartments(filterDepartmentsByFaculty(departments, formData.faculty));

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData((prev) => {
      // Pokud uživatel slug ručně nezměnil, generujeme ho automaticky podle jména
      const autoSlug = generateTeacherSlug(prev.name);
      if (prev.slug === autoSlug || prev.slug === "") {
        return { ...prev, name: newName, slug: generateTeacherSlug(newName) };
      }
      return { ...prev, name: newName };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.slug.trim()) {
      setError("Jméno a slug jsou povinné");
      return;
    }

    startTransition(async () => {
      const selectedDepartment = availableDepartments.find((department) => department.id === formData.department_id) ?? null;
      const result = isEditing
        ? await updateTeacher(teacher.id, {
            ...formData,
            department_id: selectedDepartment?.id ?? null,
            department: selectedDepartment?.name ?? null,
          })
        : await createTeacher({
            ...formData,
            department_id: selectedDepartment?.id ?? null,
            department: selectedDepartment?.name ?? null,
            is_approved: true,
          });

      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-card p-6 shadow-lg sm:rounded-xl animate-in fade-in zoom-in-95">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              {isEditing ? "Upravit vyučujícího" : "Přidat vyučujícího"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {isEditing ? "Změňte údaje o vyučujícím a uložte." : "Vyplňte údaje pro nového vyučujícího."}
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Jméno s tituly</label>
              <input
                id="name"
                value={formData.name}
                onChange={handleNameChange}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                placeholder="např. doc. RNDr. Jan Novák, Ph.D."
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">URL Slug</label>
              <input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                placeholder="např. jan-novak"
                required
              />
              <p className="text-xs text-muted-foreground">URL adresa profilu (např. /ucitele/jan-novak).</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="faculty" className="text-sm font-medium">Fakulta</label>
                <select
                  id="faculty"
                  value={formData.faculty}
                  onChange={(e) => setFormData((prev) => ({ ...prev, faculty: e.target.value, department_id: "", department: "" }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                >
                  {FACULTIES.map((fac) => (
                    <option key={fac.value} value={fac.value}>{fac.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-medium">Katedra</label>
                <div className="relative">
                  <select
                    id="department"
                    value={formData.department_id}
                    onChange={(e) => {
                      const selectedDepartment = availableDepartments.find((department) => department.id === e.target.value) ?? null;
                      setFormData((prev) => ({
                        ...prev,
                        department_id: e.target.value,
                        department: normalizeDepartmentName(selectedDepartment?.name) ?? "",
                      }));
                    }}
                    className="w-full px-3 py-2 pr-8 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                  >
                    <option value="">Vyber katedru</option>
                    {availableDepartments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Chybí katedra? Přidej ji nejdřív ve správě kateder.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Zrušit
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditing ? "Uložit změny" : "Přidat vyučujícího"}
              </button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Zavřít</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
