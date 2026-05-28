"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTeacher, deleteTeacher } from "@/app/admin/ucitele/actions";
import { TeacherFormDialog } from "@/components/admin/teacher-form-dialog";
import { CheckCircle, XCircle, Pencil, Loader2 } from "lucide-react";
import type { Teacher } from "@/lib/types/database";

interface TeacherApprovalCardProps {
  teacher: Teacher;
}

export function TeacherApprovalCard({ teacher }: TeacherApprovalCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setError(null);
    startTransition(async () => {
      const result = await updateTeacher(teacher.id, { is_approved: true });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleReject = async () => {
    if (!confirm("Opravdu chcete tento návrh učitele smazat?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTeacher(teacher.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Nový učitel
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(teacher.created_at).toLocaleDateString("cs-CZ")}
            </span>
          </div>
          <h3 className="font-semibold text-lg text-foreground">{teacher.name}</h3>
          <div className="text-sm text-muted-foreground mt-1 flex gap-2 items-center">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{teacher.faculty}</span>
            <span>{teacher.department || "Katedra neuvedena"}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Slug: <span className="font-mono">{teacher.slug}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        {error && (
          <p className="text-xs text-destructive w-full mb-2">{error}</p>
        )}
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-1 px-3 py-1.5 text-sm font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-md transition-colors flex items-center justify-center gap-2 border border-emerald-500/20"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Schválit
        </button>

        <TeacherFormDialog 
          teacher={teacher}
          trigger={
            <button
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-md transition-colors flex items-center justify-center gap-2 border border-blue-500/20"
            >
              <Pencil className="w-4 h-4" />
              Upravit
            </button>
          }
        />

        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 px-3 py-1.5 text-sm font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-md transition-colors flex items-center justify-center gap-2 border border-red-500/20"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          Smazat
        </button>
      </div>
    </div>
  );
}
