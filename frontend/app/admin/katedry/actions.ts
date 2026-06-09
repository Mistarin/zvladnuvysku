"use server";

import { revalidatePath } from "next/cache";
import { normalizeDepartmentName } from "@/lib/department-name";
import { isFacultyCode } from "@/lib/faculties";
import { createClient } from "@/lib/supabase/server";
import type { DepartmentInsert } from "@/lib/types/database";

async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "moderator") {
    throw new Error("Nedostatečná oprávnění");
  }

  return supabase;
}

async function checkAdminOnly() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role as string | undefined;
  if (role !== "admin") {
    throw new Error("Nedostatečná oprávnění");
  }

  return supabase;
}

function revalidateDepartmentSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/katedry");
  revalidatePath("/admin/subjects");
  revalidatePath("/admin/ucitele");
  revalidatePath("/predmety");
  revalidatePath("/ucitele");
}

export async function createDepartment(data: DepartmentInsert) {
  try {
    if (!isFacultyCode(data.faculty)) {
      return { error: "Vyber platnou fakultu." };
    }

    const name = normalizeDepartmentName(data.name);
    if (!name) {
      return { error: "Název katedry je povinný." };
    }

    const supabase = await checkAdmin();
    const { error } = await supabase.from("departments").insert({
      name,
      faculty: data.faculty,
    } as never);

    if (error) {
      throw error;
    }

    revalidateDepartmentSurfaces();
    return { success: true };
  } catch (error) {
    console.error("Error creating department:", error);
    return { error: error instanceof Error ? error.message : "Nepodařilo se vytvořit katedru." };
  }
}

export async function updateDepartment(id: string, data: Partial<DepartmentInsert>) {
  try {
    if (data.faculty !== undefined && !isFacultyCode(data.faculty)) {
      return { error: "Vyber platnou fakultu." };
    }

    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) {
      const name = normalizeDepartmentName(data.name);
      if (!name) {
        return { error: "Název katedry je povinný." };
      }
      payload.name = name;
    }
    if (data.faculty !== undefined) {
      payload.faculty = data.faculty;
    }

    const supabase = await checkAdmin();
    const { error } = await supabase.from("departments").update(payload as never).eq("id", id);
    if (error) {
      throw error;
    }

    revalidateDepartmentSurfaces();
    return { success: true };
  } catch (error) {
    console.error("Error updating department:", error);
    return { error: error instanceof Error ? error.message : "Nepodařilo se upravit katedru." };
  }
}

export async function deleteDepartment(id: string) {
  try {
    const supabase = await checkAdminOnly();
    const [{ count: subjectCount, error: subjectError }, { count: teacherCount, error: teacherError }] = await Promise.all([
      supabase.from("subjects").select("*", { count: "exact", head: true }).eq("department_id", id),
      supabase.from("teachers").select("*", { count: "exact", head: true }).eq("department_id", id),
    ]);

    if (subjectError || teacherError) {
      return { error: "Nepodařilo se ověřit navázané záznamy." };
    }

    if ((subjectCount ?? 0) > 0 || (teacherCount ?? 0) > 0) {
      return { error: "Katedru nelze smazat, dokud je navázaná na předměty nebo vyučující." };
    }

    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) {
      throw error;
    }

    revalidateDepartmentSurfaces();
    return { success: true };
  } catch (error) {
    console.error("Error deleting department:", error);
    return { error: error instanceof Error ? error.message : "Nepodařilo se smazat katedru." };
  }
}
