'use server'

import { revalidatePath } from 'next/cache'
import { normalizeDepartmentName } from '@/lib/department-name'
import { isFacultyCode } from '@/lib/faculties'
import { getPublicProfilePath } from '@/lib/public-profile'
import { createClient } from '@/lib/supabase/server'
import type { Database, SubjectRating, TeacherRating } from '@/lib/types/database'
import { containsProfanity } from '@/lib/profanity'
import { sanitizePostgrestSearchValue } from '@/lib/postgrest-sanitize'

type ActionResult = { success: true } | { success: false; error: string }
type ReviewSaveResult = { success: true; moderationPending: boolean } | { success: false; error: string }

type SubjectProposalInput = {
  proposalId?: string | null
  type: 'new' | 'edit'
  subjectId: string | null
  submissionToken: string
  form: {
    name: string
    short_tag: string
    description: string
    target_audience: string
    real_requirements: string
    difficulty: number
    time_intensity: number
    attendance_type: string
    exam_from_home: boolean
    credits: string
    semester: string
    faculty: string
    year: string
    note: string
  }
  teachers: Array<{ id?: string; name: string; faculty?: string | null; department?: string | null }>
  materialGroupTitle?: string | null
  materialFiles: Array<{ name: string; size: number; pageCount: number | null }>
}

type SubjectProposalData = {
  name?: string
  short_tag?: string
  description?: string
  target_audience?: string
  real_requirements?: string
  difficulty?: number
  time_intensity?: number
  attendance_type?: string
  exam_from_home?: boolean
  credits?: number
  semester?: string
  faculty?: string
  year?: number
  teachers?: Array<{ id?: string; name: string; faculty?: string | null; department?: string | null }>
  material_group_title?: string | null
  materials?: Array<{ title: string; file_path: string; size_bytes: number; page_count?: number | null }>
}

type SubjectRatingInput = {
  subjectId: string
  overall: number
  difficulty?: number
  usefulness?: number
  workload?: number
  comment?: string
  isAnonymous?: boolean
}

type TeacherRatingInput = {
  teacherId: string
  rating: number
  review?: string
  isAnonymous?: boolean
}

type ExistingSubjectRatingResult =
  | { success: true; data: SubjectRating | null }
  | { success: false; error: string }

type ExistingTeacherRatingResult =
  | { success: true; data: TeacherRating | null }
  | { success: false; error: string }
type SubjectSearchItem = {
  id: string
  slug: string
  name: string
  short_tag: string
  faculty: string | null
  difficulty: number | null
  credits: number | null
  semester: string | null
}
type TeacherSearchItem = { id: string; name: string; faculty: string; department: string | null }
type SubjectDetailsResult =
  | {
      success: true
      data: {
        name: string | null
        short_tag: string | null
        description: string | null
        target_audience: string | null
        real_requirements: string | null
        difficulty: number | null
        time_intensity: number | null
        attendance_type: string | null
        exam_from_home: boolean | null
        credits: number | null
        semester: string | null
        faculty: string | null
        year: number | null
      } | null
    }
  | { success: false; error: string }

const MAX_PDF_FILE_SIZE = 2 * 1024 * 1024
const MAX_PROPOSAL_MATERIALS = 8

function revalidateReviewSurfaces(userId: string, path: string) {
  revalidatePath('/')
  revalidatePath(getPublicProfilePath(userId))
  revalidatePath(path)
}

function sanitizeProposalFilename(filename: string, fallbackExtension = 'pdf') {
  const trimmed = filename.trim()
  const extension = trimmed.split('.').pop() || fallbackExtension
  const baseName = trimmed.replace(/\.[^/.]+$/, '') || 'soubor'
  const safeBaseName = baseName
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase() || 'soubor'

  return `${safeBaseName}.${extension.toLowerCase()}`
}

function getFileEntry(formData: FormData, key: string) {
  const entry = formData.get(key)
  if (!entry || typeof entry === 'string') return null

  const file = entry as File
  return typeof file.name === 'string' && typeof file.size === 'number' && file.size > 0 ? file : null
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function startsWithUppercase(value: string) {
  return /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(value.trim())
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getProposalMaterials(data: unknown): NonNullable<SubjectProposalData['materials']> {
  if (!isRecord(data) || !Array.isArray(data.materials)) {
    return []
  }

  return data.materials.flatMap((material) => {
    if (
      !isRecord(material) ||
      typeof material.title !== 'string' ||
      typeof material.file_path !== 'string' ||
      typeof material.size_bytes !== 'number'
    ) {
      return []
    }

    return [{
      title: material.title,
      file_path: material.file_path,
      size_bytes: material.size_bytes,
      page_count: typeof material.page_count === 'number' ? material.page_count : null,
    }]
  })
}

function getProposalMaterialPaths(data: unknown) {
  return getProposalMaterials(data).map((material) => material.file_path).filter(Boolean)
}

function getProposalMaterialGroupTitle(data: unknown) {
  if (!isRecord(data) || typeof data.material_group_title !== 'string') {
    return null
  }

  const title = data.material_group_title.trim()
  return title || null
}

function isRatingValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5
}

function isOptionalIntegerInRange(value: unknown, min: number, max: number) {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return false
  if (!value.trim()) return true
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
}

function validateSubjectProposalPayload(payload: SubjectProposalInput) {
  if (!payload || typeof payload !== 'object' || !payload.form || typeof payload.form !== 'object') {
    return 'Neplatná data návrhu.'
  }

  if (payload.type !== 'new' && payload.type !== 'edit') {
    return 'Neplatný typ návrhu.'
  }

  if (payload.type === 'edit' && !hasText(payload.subjectId)) {
    return 'Vyber předmět, který chceš upravit.'
  }

  if (payload.type === 'new' && (!hasText(payload.form.name) || !hasText(payload.form.short_tag))) {
    return 'U nového předmětu vyplň název i zkratku.'
  }

  if (!isRatingValue(payload.form.difficulty) || !isRatingValue(payload.form.time_intensity)) {
    return 'Obtížnost a časová náročnost musí být v rozsahu 1 až 5.'
  }

  if (!isOptionalIntegerInRange(payload.form.credits, 1, 30)) {
    return 'Kredity musí být celé číslo v rozsahu 1 až 30.'
  }

  if (!isOptionalIntegerInRange(payload.form.year, 1, 5)) {
    return 'Ročník musí být celé číslo v rozsahu 1 až 5.'
  }

  if (hasText(payload.form.faculty) && !isFacultyCode(payload.form.faculty.trim())) {
    return 'Vyber platnou fakultu.'
  }

  if (!Array.isArray(payload.teachers) || !Array.isArray(payload.materialFiles)) {
    return 'Neplatná data návrhu.'
  }

  if (payload.materialFiles.length > MAX_PROPOSAL_MATERIALS) {
    return `Najednou lze přiložit maximálně ${MAX_PROPOSAL_MATERIALS} PDF souborů.`
  }

  const invalidTeacher = payload.teachers.find(
    (teacher) =>
      !teacher ||
      typeof teacher !== 'object' ||
      !hasText(teacher.name) ||
      (!hasText(teacher.id) && (
        (!hasText(teacher.faculty) && !hasText(payload.form.faculty)) ||
        !hasText(teacher.department)
      ))
  )
  if (invalidTeacher) {
    return 'Nový vyučující musí mít vyplněné jméno, fakultu i katedru.'
  }

  const invalidTeacherDepartment = payload.teachers.find(
    (teacher) =>
      !hasText(teacher.id) &&
      hasText(teacher.department) &&
      !startsWithUppercase(String(teacher.department)),
  )
  if (invalidTeacherDepartment) {
    return 'Název katedry musí začínat velkým písmenem.'
  }

  const invalidTeacherFaculty = payload.teachers.find(
    (teacher) => hasText(teacher.faculty) && !isFacultyCode(String(teacher.faculty).trim()),
  )
  if (invalidTeacherFaculty) {
    return 'Vyber platnou fakultu u vyučujícího.'
  }

  const invalidMaterialMeta = payload.materialFiles.find(
    (material) =>
      !material ||
      typeof material !== 'object' ||
      !hasText(material.name) ||
      typeof material.size !== 'number' ||
      material.size < 0 ||
      !(
        material.pageCount === null ||
        (typeof material.pageCount === 'number' && Number.isInteger(material.pageCount) && material.pageCount >= 1 && material.pageCount <= 9999)
      )
  )
  if (invalidMaterialMeta) {
    return 'Neplatná metadata přiloženého souboru.'
  }

  if (payload.materialGroupTitle !== undefined && payload.materialGroupTitle !== null && typeof payload.materialGroupTitle !== 'string') {
    return 'Neplatný název skupiny materiálů.'
  }

  if (typeof payload.materialGroupTitle === 'string' && payload.materialGroupTitle.trim().length > 120) {
    return 'Název skupiny může mít maximálně 120 znaků.'
  }

  return null
}

export async function submitSubjectProposal(formData: FormData): Promise<ActionResult> {
  const rawPayload = formData.get('payload')
  if (typeof rawPayload !== 'string') {
    return { success: false, error: 'Neplatná data návrhu.' }
  }

  let payload: SubjectProposalInput
  try {
    payload = JSON.parse(rawPayload) as SubjectProposalInput
  } catch {
    return { success: false, error: 'Nepodařilo se zpracovat data návrhu.' }
  }

  const validationError = validateSubjectProposalPayload(payload)
  if (validationError) {
    return { success: false, error: validationError }
  }

  if (typeof payload.submissionToken !== 'string' || !payload.submissionToken.trim()) {
    return { success: false, error: 'Chybí identifikátor odeslání návrhu.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro odeslání návrhu je potřeba se přihlásit.' }
    }

    const proposalId = typeof payload.proposalId === 'string' && payload.proposalId.trim()
      ? payload.proposalId.trim()
      : null
    let existingProposal: { data: unknown; submission_token: string | null } | null = null

    if (proposalId) {
      const { data: pendingProposal, error: proposalError } = await supabase
        .from('subject_proposals')
        .select('data, submission_token')
        .eq('id', proposalId)
        .eq('proposed_by', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (proposalError) {
        return { success: false, error: `Nepodařilo se načíst původní návrh: ${proposalError.message}` }
      }

      if (!pendingProposal) {
        return { success: false, error: 'Tento návrh už nejde upravit. Buď neexistuje, nebo už byl vyřízen.' }
      }

      existingProposal = pendingProposal as { data: unknown; submission_token: string | null }
    }

    const existingMaterials = getProposalMaterials(existingProposal?.data)
    if (existingMaterials.length + payload.materialFiles.length > MAX_PROPOSAL_MATERIALS) {
      return { success: false, error: `Návrh může mít maximálně ${MAX_PROPOSAL_MATERIALS} PDF souborů.` }
    }

    const uploadedMaterials: NonNullable<SubjectProposalData['materials']> = []
    const uploadedPaths: string[] = []
    const proposalFilesKey = payload.submissionToken.trim() || existingProposal?.submission_token || proposalId || ''
    const cleanupUploadedPaths = async () => {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('study_materials').remove(uploadedPaths)
      }
    }

    for (const [index, materialMeta] of payload.materialFiles.entries()) {
      const file = getFileEntry(formData, `material:${index}`)
      if (!file) continue

      if (!isPdfFile(file)) {
        await cleanupUploadedPaths()
        return { success: false, error: `Soubor ${materialMeta.name} není PDF.` }
      }

      if (file.size > MAX_PDF_FILE_SIZE) {
        await cleanupUploadedPaths()
        return { success: false, error: `Soubor ${materialMeta.name} přesahuje limit 2 MB.` }
      }

      const safeFilename = sanitizeProposalFilename(file.name)
      const filePath = `proposals/${proposalFilesKey}/${index}-${safeFilename}`

      const { error: uploadError } = await supabase.storage
        .from('study_materials')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        await cleanupUploadedPaths()
        return { success: false, error: `Nepodařilo se nahrát soubor ${materialMeta.name}: ${uploadError.message}` }
      }

      uploadedPaths.push(filePath)
      uploadedMaterials.push({
        title: file.name.replace(/\.pdf$/i, ''),
        file_path: filePath,
        size_bytes: file.size,
        page_count: materialMeta.pageCount,
      })
    }

    const textToCheck = [
      payload.form.name,
      payload.form.description,
      payload.form.note,
      payload.form.target_audience,
      payload.form.real_requirements,
    ].filter(Boolean).join(' ')
    if (containsProfanity(textToCheck)) {
      return { success: false, error: 'Návrh obsahuje nevhodný jazyk. Přepiš ho prosím konstruktivně — chceme pomáhat studentům, ne je urážet.' }
    }

    const normalizedTeachers = payload.teachers.map((teacher) => ({
      ...teacher,
      name: teacher.name.trim(),
      faculty: teacher.faculty?.trim() || payload.form.faculty.trim() || undefined,
      department: normalizeDepartmentName(teacher.department) ?? undefined,
    }))
    const totalMaterialCount = existingMaterials.length + uploadedMaterials.length
    const normalizedMaterialGroupTitle = payload.materialGroupTitle?.trim() || getProposalMaterialGroupTitle(existingProposal?.data) || undefined

    const proposalData: SubjectProposalData = {
      name: payload.form.name || undefined,
      short_tag: payload.form.short_tag || undefined,
      description: payload.form.description || undefined,
      target_audience: payload.form.target_audience || undefined,
      real_requirements: payload.form.real_requirements || undefined,
      difficulty: payload.form.difficulty,
      time_intensity: payload.form.time_intensity,
      attendance_type: payload.form.attendance_type || undefined,
      exam_from_home: payload.form.exam_from_home,
      credits: payload.form.credits ? Number(payload.form.credits) : undefined,
      semester: payload.form.semester || undefined,
      faculty: payload.form.faculty || undefined,
      year: payload.form.year ? Number(payload.form.year) : undefined,
      teachers: normalizedTeachers.length > 0 ? normalizedTeachers : undefined,
      material_group_title: totalMaterialCount > 1 ? normalizedMaterialGroupTitle : undefined,
      materials: totalMaterialCount > 0
        ? [...existingMaterials, ...uploadedMaterials]
        : undefined,
    }

    const proposalRow = {
      type: payload.type,
      subject_id: payload.type === 'edit' ? payload.subjectId : null,
      data: proposalData,
      note: payload.form.note || null,
      submission_token: proposalFilesKey,
    }

    const { error } = proposalId
      ? await supabase
          .from('subject_proposals')
          .update(proposalRow as never)
          .eq('id', proposalId)
          .eq('proposed_by', user.id)
          .eq('status', 'pending')
      : await supabase.from('subject_proposals').insert({
          ...proposalRow,
          proposed_by: user.id,
        } as never)

    if (error) {
      if (error.code === '23505') {
        const { data: existingRow, error: duplicateLookupError } = await supabase
          .from('subject_proposals')
          .select('id')
          .eq('submission_token', proposalFilesKey)
          .eq('proposed_by', user.id)
          .maybeSingle()

        if (!duplicateLookupError && existingRow) {
          try { revalidatePath('/moje-aktivita') } catch { /* ignore revalidation errors */ }
          return { success: true }
        }

        if (uploadedPaths.length > 0) {
          await cleanupUploadedPaths()
        }

        return { success: false, error: 'Návrh se nepodařilo bezpečně uložit kvůli konfliktu odeslání. Zkus ho prosím odeslat znovu.' }
      }
      if (uploadedPaths.length > 0) {
        await cleanupUploadedPaths()
      }
      return { success: false, error: `Nepodařilo se ${proposalId ? 'upravit' : 'odeslat'} návrh: ${error.message}` }
    }

    // Only revalidate the user-facing page, not /admin (admin revalidates on its own page load)
    try { revalidatePath('/moje-aktivita') } catch { /* ignore revalidation errors */ }
    return { success: true }
  } catch (error) {
    console.error('[submitSubjectProposal] Unexpected failure:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se odeslat návrh předmětu.',
    }
  }
}

export async function deletePendingSubjectProposal(proposalId: string): Promise<ActionResult> {
  if (!proposalId.trim()) {
    return { success: false, error: 'Chybí návrh ke smazání.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro smazání návrhu je potřeba se přihlásit.' }
    }

    const { data: proposal, error: loadError } = await supabase
      .from('subject_proposals')
      .select('id, data')
      .eq('id', proposalId)
      .eq('proposed_by', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (loadError) {
      return { success: false, error: `Nepodařilo se načíst návrh: ${loadError.message}` }
    }

    if (!proposal) {
      return { success: false, error: 'Tento návrh už nejde smazat. Buď neexistuje, nebo už byl vyřízen.' }
    }

    const { error: deleteError } = await supabase
      .from('subject_proposals')
      .delete()
      .eq('id', proposalId)
      .eq('proposed_by', user.id)
      .eq('status', 'pending')

    if (deleteError) {
      return { success: false, error: `Nepodařilo se smazat návrh: ${deleteError.message}` }
    }

    const materialPaths = getProposalMaterialPaths((proposal as { data: unknown }).data)
    if (materialPaths.length > 0) {
      const { error: storageError } = await supabase.storage.from('study_materials').remove(materialPaths)
      if (storageError) {
        console.error('[deletePendingSubjectProposal] Failed to remove proposal files:', storageError.message)
      }
    }

    try { revalidatePath('/moje-aktivita') } catch { /* ignore revalidation errors */ }
    try { revalidatePath('/navrhnout') } catch { /* ignore revalidation errors */ }
    return { success: true }
  } catch (error) {
    console.error('[deletePendingSubjectProposal] Unexpected failure:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se smazat návrh předmětu.',
    }
  }
}

export async function uploadSubjectMaterial(formData: FormData): Promise<ActionResult> {
  const subjectId = formData.get('subjectId')
  const title = formData.get('title')
  const file = getFileEntry(formData, 'file')

  if (typeof subjectId !== 'string' || !subjectId) {
    return { success: false, error: 'Chybí předmět pro nahrání materiálu.' }
  }

  if (typeof title !== 'string' || !title.trim()) {
    return { success: false, error: 'Zadejte název materiálu.' }
  }

  if (!file) {
    return { success: false, error: 'Vyber PDF soubor.' }
  }

  if (!isPdfFile(file)) {
    return { success: false, error: 'Povolene jsou pouze PDF soubory.' }
  }

  if (file.size > MAX_PDF_FILE_SIZE) {
    return { success: false, error: `Soubor je příliš velký (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximální povolená velikost je 2 MB.` }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro nahrávání musíte být přihlášeni.' }
    }

    const fileExtension = file.name.split('.').pop() || 'pdf'
    const filePath = `${subjectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('study_materials')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError || !uploadData) {
      return { success: false, error: `Chyba při nahrávání souboru: ${uploadError?.message ?? 'Soubor se nepodařilo uložit.'}` }
    }

    const rawGroupId = formData.get('groupId')
    const groupId = typeof rawGroupId === 'string' && rawGroupId ? rawGroupId : null
    const rawPageCount = formData.get('pageCount')
    const pageCount = typeof rawPageCount === 'string' && rawPageCount ? parseInt(rawPageCount, 10) || null : null

    const materialInsert: Database['public']['Tables']['subject_materials']['Insert'] = {
      subject_id: subjectId,
      uploader_id: user.id,
      title: title.trim(),
      file_path: uploadData.path,
      size_bytes: file.size,
      moderation_status: 'pending',
      rejection_reason: null,
      group_id: groupId,
      page_count: pageCount,
    }

    const { error: dbError } = await supabase.from('subject_materials').insert(materialInsert as never)
    if (dbError) {
      await supabase.storage.from('study_materials').remove([uploadData.path])
      return { success: false, error: `Chyba při ukládání záznamu: ${dbError.message}` }
    }

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('slug')
      .eq('id', subjectId)
      .single()
    const typedSubject = subjectData as { slug: string } | null
    if (typedSubject?.slug) {
      revalidatePath(`/predmety/${typedSubject.slug}`)
    }
    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nastala neočekávaná chyba při nahrávání materiálu.',
    }
  }
}

export async function getMySubjectRating(subjectId: string): Promise<ExistingSubjectRatingResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: true, data: null }
    }

    const { data, error } = await supabase
      .from('subject_ratings')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: `Nepodařilo se načíst hodnocení: ${error.message}` }
    }

    return { success: true, data: (data as SubjectRating | null) ?? null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se načíst hodnocení předmětu.',
    }
  }
}

export async function saveSubjectRating(input: SubjectRatingInput): Promise<ReviewSaveResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro hodnocení se musíš přihlásit.' }
    }

    const payload: Database['public']['Tables']['subject_ratings']['Insert'] = {
      subject_id: input.subjectId,
      user_id: user.id,
      overall: input.overall,
      difficulty: input.difficulty ?? null,
      usefulness: input.usefulness ?? null,
      workload: input.workload ?? null,
      comment: input.comment?.trim() || null,
      is_anonymous: Boolean(input.isAnonymous),
    }

    const { error } = await supabase
      .from('subject_ratings')
      .upsert(payload as never, { onConflict: 'subject_id,user_id' })

    if (error) {
      return { success: false, error: `Nepodařilo se uložit hodnocení: ${error.message}` }
    }

    const { data: moderationState, error: moderationError } = await supabase
      .from('subject_ratings')
      .select('comment_is_approved')
      .eq('subject_id', input.subjectId)
      .eq('user_id', user.id)
      .single()

    if (moderationError) {
      return { success: false, error: `Nepodařilo se ověřit stav recenze: ${moderationError.message}` }
    }

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('slug')
      .eq('id', input.subjectId)
      .single()
    const typedSubject = subjectData as { slug: string } | null
    const path = typedSubject?.slug ? `/predmety/${typedSubject.slug}` : '/predmety'
    revalidateReviewSurfaces(user.id, path)
    const moderationStateRow = moderationState as { comment_is_approved: boolean | null } | null
    return {
      success: true,
      moderationPending: Boolean(payload.comment && moderationStateRow?.comment_is_approved === false),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se uložit hodnocení předmětu.',
    }
  }
}

export async function getMyTeacherRating(teacherId: string): Promise<ExistingTeacherRatingResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: true, data: null }
    }

    const { data, error } = await supabase
      .from('teacher_ratings')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: `Nepodařilo se načíst hodnocení: ${error.message}` }
    }

    return { success: true, data: (data as TeacherRating | null) ?? null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se načíst hodnocení vyučujícího.',
    }
  }
}

export async function saveTeacherRating(input: TeacherRatingInput): Promise<ReviewSaveResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro hodnocení se musíte přihlásit.' }
    }

    const payload: Database['public']['Tables']['teacher_ratings']['Insert'] = {
      teacher_id: input.teacherId,
      user_id: user.id,
      rating: input.rating,
      review: input.review?.trim() || null,
      is_anonymous: Boolean(input.isAnonymous),
    }

    const { error } = await supabase
      .from('teacher_ratings')
      .upsert(payload as never, { onConflict: 'teacher_id,user_id' })

    if (error) {
      return { success: false, error: `Chyba při ukládání: ${error.message}` }
    }

    const { data: moderationState, error: moderationError } = await supabase
      .from('teacher_ratings')
      .select('comment_is_approved')
      .eq('teacher_id', input.teacherId)
      .eq('user_id', user.id)
      .single()

    if (moderationError) {
      return { success: false, error: `Nepodařilo se ověřit stav recenze: ${moderationError.message}` }
    }

    const { data: teacherData } = await supabase
      .from('teachers')
      .select('slug')
      .eq('id', input.teacherId)
      .single()
    const typedTeacher = teacherData as { slug: string } | null
    const path = typedTeacher?.slug ? `/ucitele/${typedTeacher.slug}` : '/ucitele'
    revalidateReviewSurfaces(user.id, path)
    const moderationStateRow = moderationState as { comment_is_approved: boolean | null } | null
    return {
      success: true,
      moderationPending: Boolean(payload.review && moderationStateRow?.comment_is_approved === false),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se uložit hodnocení vyučujícího.',
    }
  }
}

export async function deleteOwnSubjectRating(subjectId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro smazání hodnocení se musíš přihlásit.' }
    }

    const { error } = await supabase
      .from('subject_ratings')
      .delete()
      .eq('subject_id', subjectId)
      .eq('user_id', user.id)

    if (error) {
      return { success: false, error: `Nepodařilo se smazat hodnocení: ${error.message}` }
    }

    const { data: subjectData } = await supabase
      .from('subjects')
      .select('slug')
      .eq('id', subjectId)
      .single()
    const typedSubject = subjectData as { slug: string } | null
    const path = typedSubject?.slug ? `/predmety/${typedSubject.slug}` : '/predmety'
    revalidateReviewSurfaces(user.id, path)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se smazat hodnocení předmětu.',
    }
  }
}

export async function deleteOwnTeacherRating(teacherId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro smazání hodnocení se musíte přihlásit.' }
    }

    const { error } = await supabase
      .from('teacher_ratings')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('user_id', user.id)

    if (error) {
      return { success: false, error: `Nepodařilo se smazat hodnocení: ${error.message}` }
    }

    const { data: teacherData } = await supabase
      .from('teachers')
      .select('slug')
      .eq('id', teacherId)
      .single()
    const typedTeacher = teacherData as { slug: string } | null
    const path = typedTeacher?.slug ? `/ucitele/${typedTeacher.slug}` : '/ucitele'
    revalidateReviewSurfaces(user.id, path)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se smazat hodnocení vyučujícího.',
    }
  }
}

export async function searchSubjectsForProposal(query: string): Promise<{ success: true; data: SubjectSearchItem[] } | { success: false; error: string }> {
  const normalizedQuery = sanitizePostgrestSearchValue(query)
  if (normalizedQuery.length < 2) {
    return { success: true, data: [] }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subject_search_view')
      .select('id, slug, name, short_tag, faculty, difficulty, credits, semester')
      .or(`name.ilike.%${normalizedQuery}%,short_tag.ilike.%${normalizedQuery}%`)
      .limit(6)

    if (error) {
      return { success: false, error: `Nepodařilo se vyhledat předměty: ${error.message}` }
    }

    return { success: true, data: (data as SubjectSearchItem[] | null) ?? [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se vyhledat předměty.',
    }
  }
}

export async function getSubjectSearchCache(): Promise<{ success: true; data: SubjectSearchItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subject_search_view')
      .select('id, slug, name, short_tag, faculty, difficulty, credits, semester')
      .order('name')

    if (error) {
      return { success: false, error: `Nepodařilo se načíst cache předmětů: ${error.message}` }
    }

    return { success: true, data: (data as SubjectSearchItem[] | null) ?? [] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se načíst cache předmětů.',
    }
  }
}

export async function searchTeachersForProposal(query: string): Promise<{ success: true; data: TeacherSearchItem[] } | { success: false; error: string }> {
  const normalizedQuery = sanitizePostgrestSearchValue(query)
  if (normalizedQuery.length < 2) {
    return { success: true, data: [] }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, faculty, department')
      .ilike('name', `%${normalizedQuery}%`)
      .limit(6)

    if (error) {
      return { success: false, error: `Nepodařilo se vyhledat vyučující: ${error.message}` }
    }

    return {
      success: true,
      data: ((data as TeacherSearchItem[] | null) ?? []).map((teacher) => ({
        ...teacher,
        department: normalizeDepartmentName(teacher.department),
      })),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se vyhledat vyučující.',
    }
  }
}

export async function getTeacherSearchCache(): Promise<{ success: true; data: TeacherSearchItem[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, faculty, department')
      .eq('is_approved', true)
      .order('name')

    if (error) {
      return { success: false, error: `Nepodařilo se načíst cache vyučujících: ${error.message}` }
    }

    return {
      success: true,
      data: ((data as TeacherSearchItem[] | null) ?? []).map((teacher) => ({
        ...teacher,
        department: normalizeDepartmentName(teacher.department),
      })),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se načíst cache vyučujících.',
    }
  }
}

export async function getSubjectDetailsForProposal(subjectId: string): Promise<SubjectDetailsResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subjects')
      .select('name, short_tag, description, target_audience, real_requirements, difficulty, time_intensity, attendance_type, exam_from_home, credits, semester, faculty, year')
      .eq('id', subjectId)
      .single()

    if (error) {
      return { success: false, error: `Nepodařilo se načíst data předmětu: ${error.message}` }
    }

    return { success: true, data: data ?? null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se načíst data vybraného předmětu.',
    }
  }
}

export async function createMaterialGroup(input: {
  title: string
  subjectId: string
}): Promise<{ success: true; groupId: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Pro vytvoření skupiny musíte být přihlášeni.' }

    const title = input.title.trim()
    if (!title) return { success: false, error: 'Zadejte název skupiny.' }
    if (title.length > 120) return { success: false, error: 'Název skupiny může mít maximálně 120 znaků.' }

    const { data, error } = await (supabase as unknown as ReturnType<typeof supabase.from>)
      .from('material_groups')
      .insert({ title, subject_id: input.subjectId, uploader_id: user.id } as never)
      .select('id')
      .single() as unknown as { data: { id: string } | null; error: { message: string } | null }

    if (error || !data) return { success: false, error: `Nepodařilo se vytvořit skupinu: ${error?.message ?? 'neznámá chyba'}` }

    return { success: true, groupId: (data as unknown as { id: string }).id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Nepodařilo se vytvořit skupinu.' }
  }
}

export async function deleteMaterialGroup(groupId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Musíte být přihlášeni.' }

    // Only owner or admin can delete
    const { data: group } = await (supabase as unknown as ReturnType<typeof supabase.from>)
      .from('material_groups')
      .select('uploader_id')
      .eq('id', groupId)
      .single() as unknown as { data: { uploader_id: string } | null; error: unknown }

    if (!group) return { success: false, error: 'Skupina nenalezena.' }
    if ((group as unknown as { uploader_id: string }).uploader_id !== user.id) return { success: false, error: 'Nemáte oprávnění smazat tuto skupinu.' }

    await supabase.from('subject_materials').update({ group_id: null } as never).eq('group_id', groupId)

    const { error } = await (supabase as unknown as ReturnType<typeof supabase.from>)
      .from('material_groups').delete().eq('id', groupId) as unknown as { error: { message: string } | null }
    if (error) return { success: false, error: `Nepodařilo se smazat skupinu: ${error.message}` }

    try { revalidatePath('/moje-aktivita') } catch { /* ignore */ }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Nepodařilo se smazat skupinu.' }
  }
}

export async function renameMaterialGroup(groupId: string, newTitle: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Musíte být přihlášeni.' }

    const title = newTitle.trim()
    if (!title) return { success: false, error: 'Zadejte název skupiny.' }
    if (title.length > 120) return { success: false, error: 'Název skupiny může mít maximálně 120 znaků.' }

    const { error } = await (supabase as unknown as ReturnType<typeof supabase.from>)
      .from('material_groups')
      .update({ title } as never)
      .eq('id', groupId)
      .eq('uploader_id', user.id) as unknown as { error: { message: string } | null }

    if (error) return { success: false, error: `Nepodařilo se přejmenovat skupinu: ${error.message}` }

    try { revalidatePath('/moje-aktivita') } catch { /* ignore */ }
    try { revalidatePath('/profil/[userId]', 'page') } catch { /* ignore */ }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Nepodařilo se přejmenovat skupinu.' }
  }
}
