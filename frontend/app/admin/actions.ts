'use server'

import { revalidatePath } from 'next/cache'
import { normalizeDepartmentName } from '@/lib/department-name'
import { getPublicProfilePath } from '@/lib/public-profile'
import { createClient } from '@/lib/supabase/server'
import { generateTeacherSlug } from '@/lib/teacher-slug'
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
type MaterialGroupInsert = Database['public']['Tables']['material_groups']['Insert']
type SubjectMaterialRow = Database['public']['Tables']['subject_materials']['Row']
type SubjectMaterialInsert = Database['public']['Tables']['subject_materials']['Insert']
type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
type SubjectTeacherInsert = Database['public']['Tables']['subject_teachers']['Insert']
type FeedbackUpdate = Database['public']['Tables']['feedback']['Update']

type ProposalTeacher = { id?: string; name: string; faculty?: string | null; department?: string | null }
type ProposalMaterial = { title: string; file_path: string; size_bytes: number; page_count?: number | null }
type ProposalPayload = SubjectInsert & {
  teachers?: ProposalTeacher[]
  materials?: ProposalMaterial[]
  material_group_title?: string | null
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

function revalidateContributionSurfaces(userId?: string | null) {
  revalidatePath('/')
  revalidatePath('/jak-to-funguje')
  revalidatePath('/materialy')

  if (userId) {
    revalidatePath(getPublicProfilePath(userId))
  }
}

function generateSubjectSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function withSlugSuffix(baseSlug: string, attempt: number) {
  if (attempt === 0) return baseSlug
  return `${baseSlug}-${attempt + 1}`
}

function normalizeProposalMaterials(materials: ProposalMaterial[] | undefined) {
  return (materials ?? []).flatMap((material) => {
    if (!material || !material.file_path || !material.title || typeof material.size_bytes !== 'number') {
      return []
    }

    const pageCount = typeof material.page_count === 'number' && Number.isInteger(material.page_count) && material.page_count >= 1
      ? material.page_count
      : null

    return [{
      title: material.title.trim(),
      file_path: material.file_path,
      size_bytes: material.size_bytes,
      page_count: pageCount,
    }]
  })
}

function normalizeProposalMaterialGroupTitle(title: string | null | undefined) {
  const normalized = title?.trim()
  return normalized ? normalized.slice(0, 120) : null
}

function buildMaterialGroupFallbackTitle(subject: Pick<Database['public']['Tables']['subjects']['Row'], 'name' | 'short_tag'>) {
  const base = subject.short_tag?.trim() || subject.name?.trim() || 'Materiály'
  return `${base} — materiály`
}

async function insertSubjectWithUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: SubjectInsert
) {
  const baseSlug = generateSubjectSlug(payload.slug?.trim() || payload.short_tag?.trim() || payload.name?.trim() || 'predmet') || 'predmet'
  let lastError: { code?: string; message?: string } | null = null

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const nextPayload: SubjectInsert = {
      ...payload,
      slug: withSlugSuffix(baseSlug, attempt),
    }

    const { data, error } = await supabase.from('subjects').insert(nextPayload as never).select().single()
    if (!error && data) {
      return { data: data as Database['public']['Tables']['subjects']['Row'], error: null }
    }

    lastError = error ?? null
    if (error?.code !== '23505') {
      return { data: null, error }
    }
  }

  return { data: null, error: lastError }
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

async function createProposalMaterialGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subject: Pick<Database['public']['Tables']['subjects']['Row'], 'id' | 'name' | 'short_tag'>,
  uploaderId: string,
  title: string | null,
) {
  const groupInsert: MaterialGroupInsert = {
    title: title ?? buildMaterialGroupFallbackTitle(subject),
    subject_id: subject.id,
    uploader_id: uploaderId,
  }

  const { data, error } = await supabase
    .from('material_groups')
    .insert(groupInsert as never)
    .select('id')
    .single()

  if (error || !data) {
    return { data: null, error: error ?? { message: 'Skupinu materiálů se nepodařilo vytvořit.' } }
  }

  return { data: data as { id: string }, error: null }
}

export async function approveProposal(
  proposalId: string,
  reviewInput?: {
    materials?: ProposalMaterial[]
    materialGroupTitle?: string | null
  },
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await getAdminClient()
    const reviewedAt = new Date().toISOString()

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

    let approvedSubjectId = proposal.subject_id

    if (proposal.type === 'new') {
      const insertData = { ...(proposal.data as ProposalPayload) }
      const teachers = insertData.teachers
      delete insertData.teachers

      const materials = normalizeProposalMaterials(reviewInput?.materials ?? insertData.materials)
      delete insertData.materials
      const materialGroupTitle = normalizeProposalMaterialGroupTitle(
        reviewInput?.materialGroupTitle ?? insertData.material_group_title,
      )
      delete insertData.material_group_title

      const { data: insertedSubjectData, error: insertError } = await insertSubjectWithUniqueSlug(supabase, insertData)
      if (insertError || !insertedSubjectData) return { success: false, error: `Chyba při vkládání: ${insertError?.message ?? 'Předmět se nepodařilo vytvořit.'}` }
      const insertedSubject = insertedSubjectData
      approvedSubjectId = insertedSubject.id

      if (teachers && teachers.length > 0) {
        const teacherResult = await processTeachers(supabase, insertedSubject.id, teachers, proposal.proposed_by)
        if (!teacherResult.success) return teacherResult
      }

      if (materials && materials.length > 0) {
        let groupId: string | null = null
        if (materials.length > 1) {
          const { data: groupData, error: groupError } = await createProposalMaterialGroup(
            supabase,
            insertedSubject,
            proposal.proposed_by,
            materialGroupTitle,
          )
          if (groupError || !groupData) {
            return { success: false, error: `Předmět byl vytvořen, ale skupinu materiálů se nepodařilo založit: ${groupError?.message ?? 'neznámá chyba'}` }
          }
          groupId = groupData.id
        }

        const materialsToInsert: SubjectMaterialInsert[] = materials.map((m) => ({
          subject_id: insertedSubject.id,
          uploader_id: proposal.proposed_by,
          title: m.title,
          file_path: m.file_path,
          size_bytes: m.size_bytes,
          is_approved: true,
          moderation_status: 'approved',
          rejection_reason: null,
          group_id: groupId,
          page_count: m.page_count ?? null,
        }))
        const { error: materialsError } = await supabase.from('subject_materials').insert(materialsToInsert as never)
        if (materialsError) return { success: false, error: `Předmět byl vytvořen, ale materiály se nepodařilo připojit: ${materialsError.message}` }
      }
    } else if (proposal.type === 'edit' && proposal.subject_id) {
      const subjectId = proposal.subject_id
      const updateData = { ...(proposal.data as ProposalPayload) }
      const teachers = updateData.teachers
      delete updateData.teachers

      const materials = normalizeProposalMaterials(reviewInput?.materials ?? updateData.materials)
      delete updateData.materials
      const materialGroupTitle = normalizeProposalMaterialGroupTitle(
        reviewInput?.materialGroupTitle ?? updateData.material_group_title,
      )
      delete updateData.material_group_title

      const { error: updateError } = await supabase.from('subjects').update(updateData as never).eq('id', subjectId)
      if (updateError) return { success: false, error: `Chyba při úpravě: ${updateError.message}` }

      if (teachers && teachers.length > 0) {
        const teacherResult = await processTeachers(supabase, subjectId, teachers, proposal.proposed_by)
        if (!teacherResult.success) return teacherResult
      }
      
      if (materials && materials.length > 0) {
        let groupId: string | null = null
        if (materials.length > 1) {
          const { data: groupData, error: groupError } = await createProposalMaterialGroup(
            supabase,
            {
              id: subjectId,
              name: typeof updateData.name === 'string' && updateData.name.trim() ? updateData.name : 'Předmět',
              short_tag: typeof updateData.short_tag === 'string' && updateData.short_tag.trim() ? updateData.short_tag : '',
            },
            proposal.proposed_by,
            materialGroupTitle,
          )
          if (groupError || !groupData) {
            return { success: false, error: `Změny byly uloženy, ale skupinu materiálů se nepodařilo založit: ${groupError?.message ?? 'neznámá chyba'}` }
          }
          groupId = groupData.id
        }

        const materialsToInsert: SubjectMaterialInsert[] = materials.map((m) => ({
          subject_id: subjectId,
          uploader_id: proposal.proposed_by,
          title: m.title,
          file_path: m.file_path,
          size_bytes: m.size_bytes,
          is_approved: true,
          moderation_status: 'approved',
          rejection_reason: null,
          group_id: groupId,
          page_count: m.page_count ?? null,
        }))
        const { error: materialsError } = await supabase.from('subject_materials').insert(materialsToInsert as never)
        if (materialsError) return { success: false, error: `Změny byly uloženy, ale materiály se nepodařilo připojit: ${materialsError.message}` }
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
      .update({ status: 'approved', reviewed_by: userId, reviewed_at: reviewedAt, subject_id: approvedSubjectId })
      .eq('id', proposalId)

    if (statusError) return { success: false, error: 'Chyba při aktualizaci stavu' }

    revalidatePath('/admin')
    revalidatePath('/moje-aktivita')
    revalidateContributionSurfaces(proposal.proposed_by)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

export async function rejectProposal(proposalId: string, reason?: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await getAdminClient()
    const basePayload = {
      status: 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }
    const extendedPayload = {
      ...basePayload,
      rejection_reason: reason?.trim() || null,
    }

    const proposalsTable = (supabase as unknown as {
      from: (t: string) => {
        update: (d: unknown) => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>
        }
      }
    }).from('subject_proposals')

    let { error } = await proposalsTable
      .update(extendedPayload)
      .eq('id', proposalId)

    const isLegacySchemaError =
      typeof error === 'object' &&
      error &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message.includes("'rejection_reason' column of 'subject_proposals'")

    if (isLegacySchemaError) {
      const retryResult = await proposalsTable
        .update(basePayload)
        .eq('id', proposalId)
      error = retryResult.error
    }

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
    revalidatePath('/moje-aktivita')
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
    revalidatePath('/moje-aktivita')
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
  teachers: ProposalTeacher[],
  proposedBy: string | null,
): Promise<ActionResult> {
  for (const t of teachers) {
    let teacherId = t.id
    if (!teacherId) {
      const faculty = t.faculty?.trim()
      if (!faculty) {
        return { success: false, error: `U nového vyučujícího ${t.name} chybí fakulta.` }
      }
      const department = normalizeDepartmentName(t.department)
      if (!department) {
        return { success: false, error: `U nového vyučujícího ${t.name} chybí katedra.` }
      }

      // Create new teacher
      const teacherInsert: TeacherInsert = {
        name: t.name,
        faculty,
        slug: `${generateTeacherSlug(t.name)}-${Math.floor(Math.random() * 1000)}`,
        department,
        is_approved: true,
        proposed_by: proposedBy,
      }
      const { data: newTeacherData, error: teacherError } = await supabase.from('teachers').insert(teacherInsert as never).select().single()
      if (teacherError) return { success: false, error: `Nepodařilo se vytvořit vyučujícího ${t.name}: ${teacherError.message}` }
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
        return { success: false, error: `Nepodařilo se připojit vyučujícího k předmětu: ${error.message}` }
      }
    }
  }

  return { success: true }
}

export async function updateMaterialScoring(
  materialId: string,
  input: {
    pageCount: number | null
    pointsOverride: 1 | 2 | 3 | 4 | null
  },
): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()

    const normalizedPageCount = input.pageCount === null
      ? null
      : Number.isInteger(input.pageCount) && input.pageCount >= 1 && input.pageCount <= 9999
        ? input.pageCount
        : NaN

    if (Number.isNaN(normalizedPageCount)) {
      return { success: false, error: 'Počet stran musí být celé číslo od 1 do 9999.' }
    }

    if (input.pointsOverride !== null && ![1, 2, 3, 4].includes(input.pointsOverride)) {
      return { success: false, error: 'Ruční body můžou být jen 1, 2, 3 nebo 4.' }
    }

    const { data: material, error: loadError } = await supabase
      .from('subject_materials')
      .select('id, uploader_id, subject:subject_id(slug)')
      .eq('id', materialId)
      .maybeSingle()

    const typedMaterial = material as {
      id: string
      uploader_id: string
      subject: { slug: string } | null
    } | null

    if (loadError) {
      return { success: false, error: `Nepodařilo se načíst materiál: ${loadError.message}` }
    }

    if (!typedMaterial) {
      return { success: false, error: 'Materiál nenalezen.' }
    }

    const { error: updateError } = await supabase
      .from('subject_materials')
      .update({
        page_count: normalizedPageCount,
        points_override: input.pointsOverride,
      } as never)
      .eq('id', materialId)

    if (updateError) {
      return { success: false, error: `Nepodařilo se uložit bodování: ${updateError.message}` }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/materialy')
    revalidatePath('/moje-aktivita')
    if (typedMaterial.subject?.slug) {
      revalidatePath(`/predmety/${typedMaterial.subject.slug}`)
    }
    revalidateContributionSurfaces(typedMaterial.uploader_id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neočekávaná chyba' }
  }
}

export async function approveMaterial(materialId: string): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient()
    const { data: material, error: loadError } = await supabase
      .from('subject_materials')
      .select('id, uploader_id')
      .eq('id', materialId)
      .maybeSingle()
    const typedMaterial = material as Pick<SubjectMaterialRow, 'id' | 'uploader_id'> | null

    if (loadError) {
      return { success: false, error: `Nepodařilo se načíst materiál: ${loadError.message}` }
    }

    if (!typedMaterial) {
      return { success: false, error: 'Materiál nenalezen.' }
    }

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
    revalidateContributionSurfaces(typedMaterial.uploader_id)
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
      .eq('moderation_status', 'approved')
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
