import { normalizeDepartmentName } from '@/lib/department-name'
import type { Database } from '@/lib/types/database'

export type Department = Database['public']['Tables']['departments']['Row']
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert']

export type DepartmentOption = Pick<Department, 'id' | 'name' | 'faculty' | 'slug'>

export function sortDepartments<T extends { name: string; faculty: string }>(departments: T[]) {
  return [...departments].sort((left, right) => {
    const facultyCompare = left.faculty.localeCompare(right.faculty, 'cs')
    if (facultyCompare !== 0) return facultyCompare
    return left.name.localeCompare(right.name, 'cs')
  })
}

export function filterDepartmentsByFaculty<T extends { faculty: string }>(
  departments: T[],
  faculty: string | null | undefined,
) {
  if (!faculty) return departments
  return departments.filter((department) => department.faculty === faculty)
}

export function resolveDepartmentName(
  department: { name?: string | null } | null | undefined,
  fallback: string | null | undefined,
) {
  return normalizeDepartmentName(department?.name ?? fallback)
}
