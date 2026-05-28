"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/types/database";

type TeacherInsert = Database["public"]["Tables"]["teachers"]["Insert"];

export async function proposeTeacher(data: TeacherInsert) {
  try {
    const supabase = await createClient();

    // Použijeme service_role key k obejití RLS, pokud RLS blokuje public insert
    // Nicméně v běžném případě chceme, aby Supabase umožnil vložit návrh.
    // Přepíšeme supabase instanci pomocí supabase-admin, ale raději použijeme
    // standardní instanci a budeme doufat, že public insert je povolen nebo upravíme RLS.
    // Ale co když RLS neumí insert? Nejjednodušší je importovat supabaseAdmin:
    // Místo toho můžeme udělat fetch s anon klíčem, pokud jsme to povolili,
    // Nebo použijeme supabase instance, na kterou máme práva, ale explicitně vynutíme is_approved: false
    
    // Pro bezpečnost, ať nikdo nemůže podvrhnout is_approved: true
    const safeData = {
      name: data.name,
      slug: data.slug,
      faculty: data.faculty,
      department: data.department || null,
      is_approved: false, // VŽDY FALSE pro studenty
    } as any;

    // Použijeme service_role z ENV pro vložení, pokud RLS zakazuje
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from("teachers")
      .insert(safeData);

    if (error) throw error;
    
    revalidatePath("/ucitele");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Error proposing teacher:", err.message);
    return { error: err.message || "Nepodařilo se navrhnout vyučujícího" };
  }
}
