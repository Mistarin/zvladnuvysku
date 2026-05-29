"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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
    const supabase = await createClient();

    const baseSlug = data.slug?.trim() || generateSlug(data.name);
    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = withSlugSuffix(baseSlug, attempt);
      const { error } = await (supabase.from("teachers") as any).insert({
        name: data.name,
        slug,
        faculty: data.faculty,
        department: data.department || null,
        is_approved: false,
      });

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
  } catch (err: any) {
    console.error("Error proposing teacher:", err.message);
    return { error: err.message || "Nepodařilo se navrhnout vyučujícího" };
  }
}
