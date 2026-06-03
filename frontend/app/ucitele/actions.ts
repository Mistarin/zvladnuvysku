"use server";

import { revalidatePath } from "next/cache";
import { isFacultyCode } from "@/lib/faculties";
import { createClient } from "@/lib/supabase/server";
import { generateTeacherSlug } from "@/lib/teacher-slug";
import type { TeacherInsert } from "@/lib/types/database";

function withSlugSuffix(slug: string, attempt: number) {
  if (attempt === 0) return slug;
  return `${slug}-${attempt + 1}`;
}

export async function proposeTeacher(data: {
  name: string;
  slug?: string;
  faculty: string;
  department?: string;
}) {
  try {
    if (!isFacultyCode(data.faculty)) {
      return { error: "Vyber platnou fakultu." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const baseSlug = generateTeacherSlug(data.slug?.trim() || data.name);
    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = withSlugSuffix(baseSlug, attempt);
      const teacherInsert: TeacherInsert = {
        name: data.name,
        slug,
        faculty: data.faculty,
        department: data.department || null,
        is_approved: false,
        proposed_by: user?.id ?? null,
      };
      const { error } = await supabase.from("teachers").insert(teacherInsert as never);

      if (!error) {
        revalidatePath("/ucitele");
        revalidatePath("/admin");
        return { success: true };
      }

      lastError = error;
      if (error.code !== "23505") {
        throw error;
      }
    }

    throw new Error(lastError?.message || "Nepodařilo se navrhnout vyučujícího");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Nepodařilo se navrhnout vyučujícího";
    console.error("Error proposing teacher:", errorMessage);
    return { error: errorMessage };
  }
}
