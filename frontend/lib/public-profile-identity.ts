import { isFacultyCode, type FacultyCode } from '@/lib/faculties'

export type PublicProfileIdentity = {
  displayName: string
  faculty: FacultyCode
}

export type PublicProfileIdentityDraft = {
  displayName: string
  faculty: FacultyCode | ''
}

type PublicProfileIdentityRow = {
  display_name?: string | null
  faculty?: string | null
} | null | undefined

export function normalizeDisplayName(value: string | null | undefined) {
  return value?.trim() ?? ''
}

export function normalizeFaculty(value: string | null | undefined): FacultyCode | '' {
  const trimmed = value?.trim() ?? ''
  return isFacultyCode(trimmed) ? trimmed : ''
}

export function getPublicProfileIdentity(profile: PublicProfileIdentityRow): PublicProfileIdentityDraft {
  return {
    displayName: normalizeDisplayName(profile?.display_name),
    faculty: normalizeFaculty(profile?.faculty),
  }
}

export function hasPublicProfileIdentity(profile: PublicProfileIdentityRow): profile is {
  display_name: string
  faculty: FacultyCode
} {
  const identity = getPublicProfileIdentity(profile)
  return identity.displayName.length >= 2 && identity.faculty !== ''
}
