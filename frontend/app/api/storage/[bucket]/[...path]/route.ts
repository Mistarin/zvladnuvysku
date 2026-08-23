import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_BUCKETS = new Set(['study_materials', 'flashcard_media'])
const SIGNED_URL_TTL_SECONDS = 300

type RouteContext = {
  params: Promise<{ bucket: string; path: string[] }>
}

function isSafeStoragePath(path: string) {
  return Boolean(path) && !path.includes('..') && !path.includes('\\') && !path.startsWith('/')
}

export async function GET(request: Request, { params }: RouteContext) {
  const { bucket, path: pathSegments } = await params
  const storagePath = pathSegments.join('/')

  if (!ALLOWED_BUCKETS.has(bucket) || !isSafeStoragePath(storagePath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const role = typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : null
  const isAdmin = role === 'admin' || role === 'moderator'

  let allowed = false

  if (bucket === 'study_materials') {
    const { data: rawMaterial } = await supabase
      .from('subject_materials')
      .select('uploader_id, moderation_status')
      .eq('file_path' as never, storagePath)
      .maybeSingle()
    const material = rawMaterial as { uploader_id: string; moderation_status: string } | null

    allowed = Boolean(
      material && (
        material.moderation_status === 'approved' ||
        material.uploader_id === user?.id ||
        isAdmin
      ),
    )
  } else {
    const { data: rawCard } = await supabase
      .from('flashcards')
      .select('deck:deck_id(creator_id, is_public)')
      .eq('media_path' as never, storagePath)
      .maybeSingle()
    const card = rawCard as { deck: { creator_id: string; is_public: boolean } | { creator_id: string; is_public: boolean }[] | null } | null

    const deck = Array.isArray(card?.deck) ? card.deck[0] : card?.deck
    allowed = Boolean(
      deck && (
        deck.is_public === true ||
        deck.creator_id === user?.id ||
        isAdmin
      ),
    )
  }

  if (!allowed) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    return new NextResponse('Not found', { status: 404 })
  }

  return NextResponse.redirect(data.signedUrl, {
    headers: {
      'Cache-Control': 'private, max-age=240',
      'Referrer-Policy': 'no-referrer',
    },
  })
}
