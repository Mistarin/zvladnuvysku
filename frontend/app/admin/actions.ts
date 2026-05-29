'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

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

type SubjectInsert = Database['public']['Tables']['subjects']['Insert']
type SubjectMaterialInsert = Database['public']['Tables']['subject_materials']['Insert']
type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
type SubjectTeacherInsert = Database['public']['Tables']['subject_teachers']['Insert']
type FeedbackUpdate = Database['public']['Tables']['feedback']['Update']

type ProposalTeacher = { id?: string; name: string; faculty: string }
type ProposalMaterial = { title: string; file_path: string; size_bytes: number }
type ProposalPayload = SubjectInsert & {
  teachers?: ProposalTeacher[]
  materials?: ProposalMaterial[]
}

type ActionResult = { success: true } | { success: false; error: string }
type AuditActionResult<T> = { success: true; data: T } | { success: false; error: string }

export interface BrokenMaterialAuditItem {
  id: string
  title: string
  file_path: string
  created_at: string
  subject_name: string | null
  subject_slug: string | null
  status_code: number | null
  error_message: string | null
}

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nepřihlášen')

  // Verify admin/moderator role
  const role = user.app_metadata?.role as string | undefined
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
      const insertData = { ...(proposal.data as ProposalPayload) }
      const teachers = insertData.teachers
      delete insertData.teachers

      const materials = insertData.materials
      delete insertData.materials

      if (!insertData.slug) {
        const base = insertData.short_tag || insertData.name || 'predmet'
        insertData.slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }
      const { data: insertedSubjectData, error: insertError } = await supabase.from('subjects').insert(insertData as never).select().single()
      if (insertError || !insertedSubjectData) return { success: false, error: `Chyba při vkládání: ${insertError?.message ?? 'Předmět se nepodařilo vytvořit.'}` }
      const insertedSubject = insertedSubjectData as Database['public']['Tables']['subjects']['Row']

      if (teachers && teachers.length > 0) {
        await processTeachers(supabase, insertedSubject.id, teachers)
      }

      if (materials && materials.length > 0) {
        const materialsToInsert: SubjectMaterialInsert[] = materials.map((m) => ({
          subject_id: insertedSubject.id,
          uploader_id: proposal.proposed_by,
          title: m.title,
          file_path: m.file_path,
          size_bytes: m.size_bytes,
          is_approved: true,
          moderation_status: 'approved',
          rejection_reason: null,
        }))
        await supabase.from('subject_materials').insert(materialsToInsert as never)
      }
    } else if (proposal.type === 'edit' && proposal.subject_id) {
      const subjectId = proposal.subject_id
      const updateData = { ...(proposal.data as ProposalPayload) }
      const teachers = updateData.teachers
      delete updateData.teachers

      const materials = updateData.materials
      delete updateData.materials

      const { error: updateError } = await supabase.from('subjects').update(updateData as never).eq('id', subjectId)
      if (updateError) return { success: false, error: `Chyba při úpravě: ${updateError.message}` }

      if (teachers && teachers.length > 0) {
        await processTeachers(supabase, subjectId, teachers)
      }
      
      if (materials && materials.length > 0) {
        const materialsToInsert: SubjectMaterialInsert[] = materials.map((m) => ({
          subject_id: subjectId,
          uploader_id: proposal.proposed_by,
          title: m.title,
          file_path: m.file_path,
          size_bytes: m.size_bytes,
          is_approved: true,
          moderation_status: 'approved',
          rejection_reason: null,
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
    revalidatePath('/moje-aktivita')
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
        rejection_reason: reason?.trim() || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    if (error) {
      console.error('Reject error:', error)
      const errorMessage =
        typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
          ? error.message
          : JSON.stringify(error)
      return { success: false, error: `Chyba při zamítání návrhu: ${errorMessage}` }
    }

    revalidatePath('/admin')
    revalidatePath('/moje-aktivita')
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

async function processTeachers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subjectId: string,
  teachers: ProposalTeacher[]
) {
  for (const t of teachers) {
    let teacherId = t.id
    if (!teacherId) {
      // Create new teacher
      const slug = t.name.toLowerCase().replace(/[^a-z0-9á-ž]+/g, '-').replace(/(^-|-$)/g, '')
      const teacherInsert: TeacherInsert = {
        name: t.name,
        faculty: t.faculty,
        slug: slug + '-' + Math.floor(Math.random() * 1000),
        department: null,
        is_approved: true,
      }
      const { data: newTeacherData } = await supabase.from('teachers').insert(teacherInsert as never).select().single()
      const newT = newTeacherData as Database['public']['Tables']['teachers']['Row'] | null
      if (newT) teacherId = newT.id
    }
    
    if (teacherId) {
      // Link to subject
      const subjectTeacherInsert: SubjectTeacherInsert = {
        subject_id: subjectId,
        teacher_id: teacherId,
      }
      const { error } = await supabase.from('subject_teachers').insert(subjectTeacherInsert as never)
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
      .update({
        is_approved: true,
        moderation_status: 'approved',
        rejection_reason: null,
        moderated_at: new Date().toISOString(),
      } as never)
      .eq('id', materialId)

    if (error) return { success: false, error: `Chyba při schvalování materiálu: ${error.message}` }
    revalidatePath('/admin')
    revalidatePath('/predmety/[slug]', 'page')
    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neočekávaná chyba' }
  }
}

export async function rejectMaterial(materialId: string, reason?: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()

    const { error: dbError } = await supabase
      .from('subject_materials')
      .update({
        is_approved: false,
        moderation_status: 'rejected',
        rejection_reason: reason?.trim() || null,
        moderated_at: new Date().toISOString(),
      } as never)
      .eq('id', materialId)
      
    if (dbError) { 
      return { success: false, error: `Chyba při zamítnutí materiálu: ${dbError.message}` }
    }
    
    revalidatePath('/admin')
    revalidatePath('/predmety/[slug]', 'page')
    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neočekávaná chyba' }
  }
}

export async function approveRatingComment(ratingId: string, type: "subject" | "teacher"): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    const table = type === "subject" ? "subject_ratings" : "teacher_ratings"
    
    const { error } = await supabase
      .from(table)
      .update({ comment_is_approved: true } as never)
      .eq('id', ratingId)

    if (error) return { success: false, error: `Chyba při schvalování komentáře: ${error.message}` }
    
    revalidatePath('/admin')
    revalidatePath(`/${type === 'subject' ? 'predmety' : 'ucitele'}/[slug]`, 'page')
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neočekávaná chyba' }
  }
}

export async function rejectRatingComment(ratingId: string, type: "subject" | "teacher"): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    const table = type === "subject" ? "subject_ratings" : "teacher_ratings"
    
    // We only set comment/review to NULL. We don't delete the row, so the star rating remains.
    const { error } = await supabase
      .from(table)
      .update((type === "subject" ? { comment: null } : { review: null }) as never)
      .eq('id', ratingId)

    if (error) return { success: false, error: `Chyba při mazání textu komentáře: ${error.message}` }
    
    revalidatePath('/admin')
    revalidatePath(`/${type === 'subject' ? 'predmety' : 'ucitele'}/[slug]`, 'page')
    
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neočekávaná chyba' }
  }
}
export async function resolveFeedback(feedbackId: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()

    const feedbackUpdate: FeedbackUpdate = { is_resolved: true, status: 'resolved' }
    const { error } = await supabase
      .from('feedback')
      .update(feedbackUpdate as never)
      .eq('id', feedbackId)

    if (error) return { success: false, error: 'Chyba při aktualizaci stavu zpětné vazby' }

    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

export async function setFeedbackStatus(
  feedbackId: string,
  status: 'new' | 'in_progress' | 'resolved'
): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()

    const feedbackUpdate: FeedbackUpdate = { status, is_resolved: status === 'resolved' }
    const { error } = await supabase
      .from('feedback')
      .update(feedbackUpdate as never)
      .eq('id', feedbackId)

    if (error) return { success: false, error: 'Chyba při aktualizaci stavu zpětné vazby' }

    revalidatePath('/admin')
    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

export async function auditApprovedMaterials(): Promise<AuditActionResult<BrokenMaterialAuditItem[]>> {
  try {
    const { supabase } = await getAdminClient()
    const { data, error } = await supabase
      .from('subject_materials')
      .select('id, title, file_path, created_at, subject:subject_id(name, slug)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: `Nepodařilo se načíst materiály: ${error.message}` }
    }

    const materials = (data ?? []) as {
      id: string
      title: string
      file_path: string
      created_at: string
      subject: { name: string; slug: string } | null
    }[]

    const brokenItems = await Promise.all(
      materials.map(async (material) => {
        const { data: publicUrlData } = supabase.storage
          .from('study_materials')
          .getPublicUrl(material.file_path)

        try {
          const response = await fetch(publicUrlData.publicUrl, {
            method: 'HEAD',
            cache: 'no-store',
          })

          if (response.ok) {
            return null
          }

          return {
            id: material.id,
            title: material.title,
            file_path: material.file_path,
            created_at: material.created_at,
            subject_name: material.subject?.name ?? null,
            subject_slug: material.subject?.slug ?? null,
            status_code: response.status,
            error_message: null,
          } satisfies BrokenMaterialAuditItem
        } catch (error) {
          return {
            id: material.id,
            title: material.title,
            file_path: material.file_path,
            created_at: material.created_at,
            subject_name: material.subject?.name ?? null,
            subject_slug: material.subject?.slug ?? null,
            status_code: null,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          } satisfies BrokenMaterialAuditItem
        }
      })
    )

    return {
      success: true,
      data: brokenItems.filter(Boolean) as BrokenMaterialAuditItem[],
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se dokončit audit materiálů.',
    }
  }
}

export async function removeBrokenMaterialRecord(materialId: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    const { error } = await supabase
      .from('subject_materials')
      .delete()
      .eq('id', materialId)

    if (error) {
      return { success: false, error: `Nepodařilo se smazat záznam materiálu: ${error.message}` }
    }

    revalidatePath('/admin')
    revalidatePath('/predmety/[slug]', 'page')
    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se smazat záznam materiálu.',
    }
  }
}
