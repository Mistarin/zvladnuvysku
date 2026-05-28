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

export async function proposeTeacher(data: {
  name: string;
  slug?: string;
  faculty: string;
  department?: string;
}) {
  try {
    const supabase = await createClient();

    const slug = data.slug?.trim() || generateSlug(data.name);

    const { error } = await (supabase.from("teachers") as any).insert({
      name: data.name,
      slug,
      faculty: data.faculty,
      department: data.department || null,
      is_approved: false,
    });

    if (error) throw error;

    revalidatePath("/ucitele");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Error proposing teacher:", err.message);
    return { error: err.message || "Nepodařilo se navrhnout vyučujícího" };
  }
}
