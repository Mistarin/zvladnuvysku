export const FACULTIES = [
  {
    value: 'FSS',
    label: 'FSS — Fakulta sociálních studií',
    shortLabel: 'FSS',
    adminLabel: 'Sociální věda',
    color: '#FBB900',
    textDark: true,
  },
  {
    value: 'FU',
    label: 'FU — Fakulta umění',
    shortLabel: 'FU',
    adminLabel: 'Umělecká',
    color: '#D2091D',
    textDark: false,
  },
  {
    value: 'FF',
    label: 'FF — Filozofická fakulta',
    shortLabel: 'FF',
    adminLabel: 'Filozofická',
    color: '#74348B',
    textDark: false,
  },
  {
    value: 'LF',
    label: 'LF — Lékařská fakulta',
    shortLabel: 'LF',
    adminLabel: 'Lékařská',
    color: '#007CBB',
    textDark: false,
  },
  {
    value: 'PdF',
    label: 'PdF — Pedagogická fakulta',
    shortLabel: 'PdF',
    adminLabel: 'Pedagogická',
    color: '#EE7202',
    textDark: false,
  },
  {
    value: 'PřF',
    label: 'PřF — Přírodovědecká fakulta',
    shortLabel: 'PřF',
    adminLabel: 'Přírodní vědy',
    color: '#7A9B21',
    textDark: false,
  },
] as const

export type FacultyCode = (typeof FACULTIES)[number]['value']

export const FACULTY_VALUES = FACULTIES.map((faculty) => faculty.value)

export const FACULTY_COLORS = Object.fromEntries(
  FACULTIES.map((faculty) => [faculty.value, faculty.color]),
) as Record<FacultyCode, string>

export function isFacultyCode(value: string | null | undefined): value is FacultyCode {
  return FACULTY_VALUES.includes(value as FacultyCode)
}

export function getFacultyOption(value: string | null | undefined) {
  return FACULTIES.find((faculty) => faculty.value === value) ?? null
}

export function getFacultyColor(value: string | null | undefined) {
  return getFacultyOption(value)?.color ?? null
}
