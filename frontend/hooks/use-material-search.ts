'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseSearchMode } from '@/lib/search-mode'

export interface MaterialSearchResult {
  id: string
  title: string
  file_path: string
  size_bytes: number
  created_at: string
  subject: { name: string; slug: string; short_tag: string } | null
}

interface UseMaterialSearchReturn {
  isMaterialMode: boolean
  materialQuery: string
  materialResults: MaterialSearchResult[]
  isMaterialLoading: boolean
}

export function useMaterialSearch(query: string): UseMaterialSearchReturn {
  const parsed = parseSearchMode(query)
  const isMaterialMode = parsed.mode === 'materials'
  const materialQuery = isMaterialMode ? parsed.modeQuery : ''

  const [materialResults, setMaterialResults] = useState<MaterialSearchResult[]>([])
  const [isMaterialLoading, setIsMaterialLoading] = useState(false)

  useEffect(() => {
    if (!isMaterialMode) {
      setMaterialResults([])
      return
    }

    setIsMaterialLoading(true)
    const supabase = createClient()

    const run = async () => {
      let q = supabase
        .from('subject_materials')
        .select('id, title, file_path, size_bytes, created_at, subject:subject_id(name, slug, short_tag)')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(8)

      if (materialQuery.length >= 1) {
        q = q.ilike('title', `%${materialQuery}%`)
      }

      const { data } = await q
      setMaterialResults((data as MaterialSearchResult[]) || [])
      setIsMaterialLoading(false)
    }

    run()
  }, [isMaterialMode, materialQuery])

  return { isMaterialMode, materialQuery, materialResults, isMaterialLoading }
}
