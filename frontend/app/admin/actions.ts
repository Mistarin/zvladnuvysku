'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Inline type for subject_proposals (table not in generated Database types yet)
interface SubjectProposal {
  id: string
  type: 'new' | 'edit'
  subject_id: string | null
  data: Record<string, unknown>
  note: string | null
  proposed_by: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

type ActionResult = { success: true } | { success: false; error: string }

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nepřihlášen')

  // Verify admin/moderator role
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined)
  if (role !== 'admin' && role !== 'moderator') {
    throw new Error('Nedostatečná oprávnění')
  }

  return { supabase, userId: user.id }
}

export async function approveProposal(proposalId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await getAdminClient()

    // Fetch the proposal
    const { data: proposal, error: fetchError } = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (k: string, v: string) => {
            single: () => Promise<{ data: SubjectProposal | null; error: unknown }>
          }
        }
      }
    })
      .from('subject_proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (fetchError || !proposal) return { success: false, error: 'Návrh nenalezen' }

    if (proposal.type === 'new') {
      const insertData = { ...proposal.data } as Record<string, any>
      const teachers = insertData.teachers as { id?: string, name: string, faculty: string }[] | undefined
      delete insertData.teachers

      if (!insertData.slug) {
        const base = insertData.short_tag || insertData.name || 'predmet'
        insertData.slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }
      const { data: insertedSubject, error: insertError } = await supabase.from('subjects').insert(insertData as never).select().single()
      if (insertError) return { success: false, error: `Chyba při vkládání: ${insertError.message}` }

      if (teachers && teachers.length > 0) {
        await processTeachers(supabase, (insertedSubject as any).id, teachers)
      }

      const materials = insertData.materials as { title: string, file_path: string, size_bytes: number }[] | undefined
      delete insertData.materials

      if (materials && materials.length > 0) {
        const materialsToInsert = materials.map(m => ({
          subject_id: (insertedSubject as any).id,
          uploader_id: proposal.proposed_by,
          title: m.title,
          file_path: m.file_path,
          size_bytes: m.size_bytes,
          is_approved: true
        }))
        await supabase.from('subject_materials').insert(materialsToInsert as never)
      }
    } else if (proposal.type === 'edit' && proposal.subject_id) {
      const updateData = { ...proposal.data } as Record<string, any>
      const teachers = updateData.teachers as { id?: string, name: string, faculty: string }[] | undefined
      delete updateData.teachers

      const { error: updateError } = await supabase.from('subjects').update(updateData as never).eq('id', proposal.subject_id)
      if (updateError) return { success: false, error: `Chyba při úpravě: ${updateError.message}` }

      if (teachers && teachers.length > 0) {
        await processTeachers(supabase, proposal.subject_id, teachers)
      }

      const materials = updateData.materials as { title: string, file_path: string, size_bytes: number }[] | undefined
      delete updateData.materials
      
      if (materials && materials.length > 0) {
        const materialsToInsert = materials.map(m => ({
          subject_id: proposal.subject_id,
          uploader_id: proposal.proposed_by,
          title: m.title,
          file_path: m.file_path,
          size_bytes: m.size_bytes,
          is_approved: true
        }))
        await supabase.from('subject_materials').insert(materialsToInsert as never)
      }
    }

    // Mark proposal as approved
    const { error: statusError } = await (supabase as unknown as {
      from: (t: string) => {
        update: (d: unknown) => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>
        }
      }
    })
      .from('subject_proposals')
      .update({ status: 'approved', reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq('id', proposalId)

    if (statusError) return { success: false, error: 'Chyba při aktualizaci stavu' }

    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

export async function rejectProposal(proposalId: string, reason?: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await getAdminClient()

    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        update: (d: unknown) => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>
        }
      }
    })
      .from('subject_proposals')
      .update({
        status: 'rejected',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    if (error) {
      console.error('Reject error:', error)
      return { success: false, error: `Chyba při zamítání návrhu: ${(error as any).message || JSON.stringify(error)}` }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

export async function deleteSubject(subjectId: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId)
    if (error) return { success: false, error: `Chyba při mazání: ${error.message}` }
    revalidatePath('/admin')
    revalidatePath('/predmety')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

export async function updateSubject(subjectId: string, data: Record<string, unknown>): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    const { error } = await supabase.from('subjects').update(data as never).eq('id', subjectId)
    if (error) return { success: false, error: `Chyba při ukládání: ${error.message}` }
    revalidatePath('/admin')
    revalidatePath('/predmety')
    revalidatePath(`/predmety/${data.slug ?? subjectId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

async function processTeachers(supabase: any, subjectId: string, teachers: { id?: string, name: string, faculty: string }[]) {
  for (const t of teachers) {
    let teacherId = t.id
    if (!teacherId) {
      // Create new teacher
      const slug = t.name.toLowerCase().replace(/[^a-z0-9á-ž]+/g, '-').replace(/(^-|-$)/g, '')
      const { data: newT } = await supabase.from('teachers').insert({
        name: t.name,
        faculty: t.faculty,
        slug: slug + '-' + Math.floor(Math.random() * 1000)
      }).select().single()
      if (newT) teacherId = newT.id
    }
    
    if (teacherId) {
      // Link to subject
      const { error } = await supabase.from('subject_teachers').insert({
        subject_id: subjectId,
        teacher_id: teacherId
      })
      if (error && error.code !== '23505') { // Ignore unique violation if already linked
        console.error('Failed to link teacher:', error)
      }
    }
  }
}

export async function approveMaterial(materialId: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    const { error } = await supabase
      .from('subject_materials')
      .update({ is_approved: true } as never)
      .eq('id', materialId)

    if (error) return { success: false, error: `Chyba při schvalování materiálu: ${error.message}` }
    revalidatePath('/admin')
    revalidatePath('/predmety/[slug]', 'page')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Neočekávaná chyba' }
  }
}

export async function rejectMaterial(materialId: string, filePath: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    
    // The storage trigger will automatically delete the database row if we delete the file first
    const { error: storageError } = await supabase.storage
      .from('study_materials')
      .remove([filePath])

    if (storageError) {
      // If file doesn't exist in storage, we just delete the row
      console.warn("Storage delete failed or file not found:", storageError)
    }

    // Try deleting the row directly in case the trigger didn't fire or file was already gone
    const { error: dbError } = await supabase
      .from('subject_materials')
      .delete()
      .eq('id', materialId)
      
    if (dbError && dbError.code !== 'P0002') { 
      return { success: false, error: `Chyba při mazání materiálu: ${dbError.message}` }
    }
    
    revalidatePath('/admin')
    revalidatePath('/predmety/[slug]', 'page')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Neočekávaná chyba' }
  }
}
