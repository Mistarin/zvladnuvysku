"use client";

import { useState, useTransition } from "react";
import type { Teacher } from "@/lib/types/database";
import { TeacherFormDialog } from "@/components/admin/teacher-form-dialog";
import { deleteTeacher } from "@/app/admin/ucitele/actions";
import { Plus, Edit2, Trash2, Search, Loader2 } from "lucide-react";

export function TeacherList({ initialTeachers }: { initialTeachers: Teacher[] }) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredTeachers = initialTeachers.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.department?.toLowerCase().includes(search.toLowerCase()) ||
    t.faculty.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Opravdu chcete smazat vyučujícího ${name}?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteTeacher(id);
      if (res.error) {
        alert("Chyba při mazání: " + res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Hledat vyučující..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
          />
        </div>
        
        <TeacherFormDialog 
          trigger={
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
              <Plus className="w-4 h-4" />
              Přidat vyučujícího
            </button>
          } 
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Jméno</th>
                <th className="px-4 py-3 font-semibold text-foreground hidden sm:table-cell">Slug</th>
                <th className="px-4 py-3 font-semibold text-foreground">Fakulta / Katedra</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border relative">
              {isPending && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Žádní vyučující nebyli nalezeni.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{teacher.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{teacher.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs rounded-md bg-muted font-medium">
                          {teacher.faculty}
                        </span>
                        {teacher.department && (
                          <span className="text-muted-foreground text-xs">{teacher.department}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TeacherFormDialog 
                          teacher={teacher}
                          trigger={
                            <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Upravit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          }
                        />
                        <button 
                          onClick={() => handleDelete(teacher.id, teacher.name)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" 
                          title="Smazat"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
