import { isFacultyCode, type FacultyCode } from '@/lib/faculties'

export type PublicProfileIdentity = {
  displayName: string
  faculty: FacultyCode
  secondaryFaculty: FacultyCode | ''
  faculties: FacultyCode[]
  acceptLegal: boolean
}

export type PublicProfileIdentityDraft = {
  displayName: string
  faculty: FacultyCode | ''
  secondaryFaculty: FacultyCode | ''
  faculties: FacultyCode[]
  acceptLegal: boolean
}

type PublicProfileIdentityRow = {
  display_name?: string | null
  faculty?: string | null
  secondary_faculty?: string | null
} | null | undefined

export function normalizeDisplayName(value: string | null | undefined) {
  return value?.trim() ?? ''
}

export function normalizeFaculty(value: string | null | undefined): FacultyCode | '' {
  const trimmed = value?.trim() ?? ''
  return isFacultyCode(trimmed) ? trimmed : ''
}

export function normalizeFacultyList(values: Array<string | null | undefined>): FacultyCode[] {
  const seen = new Set<FacultyCode>()
  const result: FacultyCode[] = []

  for (const value of values) {
    const normalized = normalizeFaculty(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result.slice(0, 2)
}

export function getPublicProfileIdentity(profile: PublicProfileIdentityRow): PublicProfileIdentityDraft {
  const faculties = normalizeFacultyList([profile?.faculty, profile?.secondary_faculty])

  return {
    displayName: normalizeDisplayName(profile?.display_name),
    faculty: faculties[0] ?? '',
    secondaryFaculty: faculties[1] ?? '',
    faculties,
    acceptLegal: false,
  }
}

export function hasPublicProfileIdentity(profile: PublicProfileIdentityRow): profile is {
  display_name: string
  faculty: FacultyCode
} {
  const identity = getPublicProfileIdentity(profile)
  return identity.displayName.length >= 2 && identity.faculty !== ''
}

export function formatPublicProfileFaculties(faculties: Array<string | null | undefined>) {
  return normalizeFacultyList(faculties).join(' · ')
}
