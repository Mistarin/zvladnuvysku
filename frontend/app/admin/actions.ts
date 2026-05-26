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

async function getAdminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nepřihlášen')
  return { supabase, userId: user.id }
}

export async function approveProposal(proposalId: string) {
  const { supabase, userId } = await getAdminClient()

  // Fetch the proposal
  const { data: proposal, error: fetchError } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: SubjectProposal | null; error: unknown }> } } } })
    .from('subject_proposals')
    .select('*')
    .eq('id', proposalId)
    .single()

  if (fetchError || !proposal) throw new Error('Návrh nenalezen')

  if (proposal.type === 'new') {
    // INSERT new subject from proposal data
    await supabase.from('subjects').insert(proposal.data as never)
  } else if (proposal.type === 'edit' && proposal.subject_id) {
    // UPDATE existing subject
    await supabase.from('subjects').update(proposal.data as never).eq('id', proposal.subject_id)
  }

  // Mark proposal as approved
  await (supabase as unknown as { from: (t: string) => { update: (d: unknown) => { eq: (k: string, v: string) => Promise<unknown> } } })
    .from('subject_proposals')
    .update({ status: 'approved', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', proposalId)

  revalidatePath('/admin')
}

export async function rejectProposal(proposalId: string, reason?: string) {
  const { supabase, userId } = await getAdminClient()

  await (supabase as unknown as { from: (t: string) => { update: (d: unknown) => { eq: (k: string, v: string) => Promise<unknown> } } })
    .from('subject_proposals')
    .update({
      status: 'rejected',
      rejection_reason: reason ?? null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', proposalId)

  revalidatePath('/admin')
}
