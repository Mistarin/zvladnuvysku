'use server'

import { revalidatePath } from 'next/cache'
import { isFacultyCode } from '@/lib/faculties'
import { CURRENT_LEGAL_ACCEPTANCE_VERSION } from '@/lib/legal-consent'
import { getPublicProfilePath } from '@/lib/public-profile'
import { createClient } from '@/lib/supabase/server'
import type { PublicProfileIdentity } from '@/lib/public-profile-identity'

type ActionResult = { success: true } | { success: false; error: string }

export async function upsertPublicProfileIdentity({
  displayName,
  faculty,
  secondaryFaculty,
  acceptLegal,
}: PublicProfileIdentity): Promise<ActionResult> {
  const trimmedDisplayName = displayName.trim()

  if (trimmedDisplayName.length < 2 || trimmedDisplayName.length > 40) {
    return { success: false, error: 'Veřejné jméno musí mít 2 až 40 znaků.' }
  }

  if (!isFacultyCode(faculty)) {
    return { success: false, error: 'Vyber jednu z podporovaných fakult.' }
  }

  if (secondaryFaculty && !isFacultyCode(secondaryFaculty)) {
    return { success: false, error: 'Druhá fakulta není platná.' }
  }

  if (secondaryFaculty && secondaryFaculty === faculty) {
    return { success: false, error: 'Druhá fakulta se musí lišit od primární.' }
  }

  if (!acceptLegal) {
    return { success: false, error: 'Pro pokračování je potřeba potvrdit pravidla komunity, soukromí a autorská práva.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro nastavení jména je potřeba se přihlásit.' }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          display_name: trimmedDisplayName,
          faculty,
          secondary_faculty: secondaryFaculty || null,
          legal_accepted_at: new Date().toISOString(),
          legal_accepted_version: CURRENT_LEGAL_ACCEPTANCE_VERSION,
        } as never,
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      return { success: false, error: `Nepodařilo se uložit veřejný profil: ${error.message}` }
    }

    revalidatePath('/')
    revalidatePath('/moje-aktivita')
    revalidatePath(getPublicProfilePath(user.id))
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Neznámá chyba při ukládání veřejného profilu.',
    }
  }
}
