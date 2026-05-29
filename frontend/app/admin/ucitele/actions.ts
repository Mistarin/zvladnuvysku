"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TeacherInsert } from "@/lib/types/database";

// Pomocná funkce pro ověření admina
async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const role = user?.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "moderator") {
    throw new Error("Nedostatečná oprávnění");
  }
  
  return supabase;
}

export async function createTeacher(data: TeacherInsert) {
  try {
    const supabase = await checkAdmin();

    const { error } = await supabase
      .from("teachers")
      .insert({
        name: data.name,
        slug: data.slug,
        faculty: data.faculty,
        department: data.department || null,
      } as never);

    if (error) throw error;
    
    revalidatePath("/admin/ucitele");
    revalidatePath("/ucitele");
    
    return { success: true };
  } catch (error) {
    console.error("Error creating teacher:", error);
    return { error: error instanceof Error ? error.message : "Nepodařilo se vytvořit vyučujícího." };
  }
}

export async function updateTeacher(id: string, data: Partial<TeacherInsert>) {
  try {
    const supabase = await checkAdmin();

    const { error } = await supabase
      .from("teachers")
      .update({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.faculty !== undefined && { faculty: data.faculty }),
        ...(data.department !== undefined && { department: data.department || null }),
        ...(data.is_approved !== undefined && { is_approved: data.is_approved }),
      } as never)
      .eq("id", id);

    if (error) throw error;
    
    revalidatePath("/admin");
    revalidatePath("/admin/ucitele");
    revalidatePath("/ucitele");
    if (data.slug) {
      revalidatePath(`/ucitele/${data.slug}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating teacher:", error);
    return { error: error instanceof Error ? error.message : "Nepodařilo se upravit vyučujícího." };
  }
}

export async function deleteTeacher(id: string) {
  try {
    const supabase = await checkAdmin();

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    revalidatePath("/admin");
    revalidatePath("/admin/ucitele");
    revalidatePath("/ucitele");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return { error: error instanceof Error ? error.message : "Nepodařilo se smazat vyučujícího." };
  }
}
