'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database, SubjectRating, TeacherRating } from '@/lib/types/database'

type ActionResult = { success: true } | { success: false; error: string }

type SubjectProposalInput = {
  type: 'new' | 'edit'
  subjectId: string | null
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
  teachers: Array<{ id?: string; name: string; faculty: string }>
  materialFiles: Array<{ name: string; size: number }>
}

type SubjectRatingInput = {
  subjectId: string
  overall: number
  difficulty?: number
  usefulness?: number
  workload?: number
  comment?: string
}

type TeacherRatingInput = {
  teacherId: string
  rating: number
  review?: string
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
type TeacherSearchItem = { id: string; name: string; faculty: string }
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

function getFileEntry(formData: FormData, key: string) {
  const entry = formData.get(key)
  return entry instanceof File && entry.size > 0 ? entry : null
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

  if (payload.type === 'edit' && !payload.subjectId) {
    return { success: false, error: 'Vyber předmět, který chceš upravit.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro odeslání návrhu je potřeba se přihlásit.' }
    }

    const uploadedMaterials: Array<{ title: string; file_path: string; size_bytes: number }> = []
    const uploadedPaths: string[] = []
    const proposalFilesKey = crypto.randomUUID()

    for (const [index, materialMeta] of payload.materialFiles.entries()) {
      const file = getFileEntry(formData, `material:${index}`)
      if (!file) continue

      if (file.type !== 'application/pdf') {
        return { success: false, error: `Soubor ${materialMeta.name} není PDF.` }
      }

      if (file.size > MAX_PDF_FILE_SIZE) {
        return { success: false, error: `Soubor ${materialMeta.name} přesahuje limit 2 MB.` }
      }

      const fileExtension = file.name.split('.').pop() || 'pdf'
      const filePath = `proposals/${proposalFilesKey}/${crypto.randomUUID()}.${fileExtension}`

      const { error: uploadError } = await supabase.storage
        .from('study_materials')
        .upload(filePath, file, { upsert: false })

      if (uploadError) {
        throw new Error(`Nepodařilo se nahrát soubor ${materialMeta.name}: ${uploadError.message}`)
      }

      uploadedPaths.push(filePath)
      uploadedMaterials.push({
        title: file.name.replace(/\.pdf$/i, ''),
        file_path: filePath,
        size_bytes: file.size,
      })
    }

    const proposalData = {
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
      teachers: payload.teachers.length > 0 ? payload.teachers : undefined,
      materials: uploadedMaterials.length > 0 ? uploadedMaterials : undefined,
    }

    const { error } = await supabase.from('subject_proposals').insert({
      type: payload.type,
      subject_id: payload.type === 'edit' ? payload.subjectId : null,
      data: proposalData,
      note: payload.form.note || null,
      proposed_by: user.id,
    } as never)

    if (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('study_materials').remove(uploadedPaths)
      }
      return { success: false, error: `Nepodařilo se odeslat návrh: ${error.message}` }
    }

    revalidatePath('/admin')
    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se odeslat návrh předmětu.',
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

  if (file.type !== 'application/pdf') {
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

    const materialInsert: Database['public']['Tables']['subject_materials']['Insert'] = {
      subject_id: subjectId,
      uploader_id: user.id,
      title: title.trim(),
      file_path: uploadData.path,
      size_bytes: file.size,
      moderation_status: 'pending',
      is_approved: false,
      rejection_reason: null,
    }

    const { error: dbError } = await supabase.from('subject_materials').insert(materialInsert as never)
    if (dbError) {
      await supabase.storage.from('study_materials').remove([uploadData.path])
      return { success: false, error: `Chyba při ukládání záznamu: ${dbError.message}` }
    }

    revalidatePath('/moje-aktivita')
    revalidatePath('/predmety/[slug]', 'page')
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

export async function saveSubjectRating(input: SubjectRatingInput): Promise<ActionResult> {
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
    }

    const { error } = await supabase
      .from('subject_ratings')
      .upsert(payload as never, { onConflict: 'subject_id,user_id' })

    if (error) {
      return { success: false, error: `Nepodařilo se uložit hodnocení: ${error.message}` }
    }

    revalidatePath('/predmety/[slug]', 'page')
    return { success: true }
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

export async function saveTeacherRating(input: TeacherRatingInput): Promise<ActionResult> {
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
    }

    const { error } = await supabase
      .from('teacher_ratings')
      .upsert(payload as never, { onConflict: 'teacher_id,user_id' })

    if (error) {
      return { success: false, error: `Chyba při ukládání: ${error.message}` }
    }

    revalidatePath('/ucitele/[slug]', 'page')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se uložit hodnocení vyučujícího.',
    }
  }
}

export async function searchSubjectsForProposal(query: string): Promise<{ success: true; data: SubjectSearchItem[] } | { success: false; error: string }> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) {
    return { success: true, data: [] }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subjects')
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
      .from('subjects')
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
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) {
    return { success: true, data: [] }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, faculty')
      .ilike('name', `%${normalizedQuery}%`)
      .limit(6)

    if (error) {
      return { success: false, error: `Nepodařilo se vyhledat vyučující: ${error.message}` }
    }

    return { success: true, data: (data as TeacherSearchItem[] | null) ?? [] }
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
      .select('id, name, faculty')
      .eq('is_approved', true)
      .order('name')

    if (error) {
      return { success: false, error: `Nepodařilo se načíst cache vyučujících: ${error.message}` }
    }

    return { success: true, data: (data as TeacherSearchItem[] | null) ?? [] }
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
