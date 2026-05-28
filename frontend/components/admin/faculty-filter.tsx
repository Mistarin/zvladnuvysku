"use client"

import Link from "next/link"
import { useSearchParams, usePathname } from "next/navigation"

const FACULTIES = [
  { id: "FSS", label: "Sociální věda", color: "#FBB900", textDark: true },
  { id: "FU", label: "Umělecká", color: "#D2091D", textDark: false },
  { id: "FF", label: "Filozofická", color: "#74348B", textDark: false },
  { id: "LF", label: "Lékařská", color: "#007CBB", textDark: false },
  { id: "PdF", label: "Pedagogická", color: "#EE7202", textDark: false },
  { id: "PřF", label: "Přírodní vědy", color: "#7A9B21", textDark: false },
]

export function FacultyFilter() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const currentFaculty = searchParams.get("faculty")

  return (
    <div className="flex flex-wrap gap-2 py-2">
      <Link
        href={pathname}
        style={{
          backgroundColor: !currentFaculty ? "#02BED6" : undefined,
          color: !currentFaculty ? "#ffffff" : undefined,
          borderColor: "#02BED6"
        }}
        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
          !currentFaculty 
            ? "shadow-md scale-105" 
            : "bg-transparent text-muted-foreground hover:opacity-80"
        }`}
      >
        Všechny
      </Link>
      
      {FACULTIES.map((fac) => {
        const isActive = currentFaculty === fac.id
        
        // Preserve other searchParams
        const params = new URLSearchParams(searchParams.toString())
        params.set("faculty", fac.id)
        params.delete("page") // reset page when filtering

        return (
          <Link
            key={fac.id}
            href={`${pathname}?${params.toString()}`}
            style={{ 
              backgroundColor: isActive ? fac.color : undefined,
              color: isActive ? (fac.textDark ? "#000000" : "#ffffff") : undefined,
              borderColor: fac.color
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              isActive 
                ? "shadow-md scale-105" 
                : "bg-transparent text-muted-foreground hover:opacity-80"
            }`}
          >
            {fac.label} ({fac.id})
          </Link>
        )
      })}
    </div>
  )
}
