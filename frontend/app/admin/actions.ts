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
      const { error: insertError } = await supabase.from('subjects').insert(proposal.data as never)
      if (insertError) return { success: false, error: `Chyba při vkládání: ${insertError.message}` }
    } else if (proposal.type === 'edit' && proposal.subject_id) {
      const { error: updateError } = await supabase.from('subjects').update(proposal.data as never).eq('id', proposal.subject_id)
      if (updateError) return { success: false, error: `Chyba při úpravě: ${updateError.message}` }
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
        rejection_reason: reason ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    if (error) return { success: false, error: 'Chyba při zamítání návrhu' }

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
