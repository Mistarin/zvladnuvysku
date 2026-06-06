"use client"

import Link from "next/link"
import { useSearchParams, usePathname } from "next/navigation"
import { FACULTIES } from "@/lib/faculties"

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
          color: !currentFaculty ? "#061012" : undefined,
          borderColor: !currentFaculty ? "#02BED6" : "#303036"
        }}
        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
          !currentFaculty 
            ? "shadow-md scale-105" 
            : "bg-[#18181B] text-muted-foreground hover:bg-[#202024] hover:text-foreground"
        }`}
      >
        Všechny
      </Link>
      
      {FACULTIES.map((fac) => {
        const isActive = currentFaculty === fac.value
        
        // Preserve other searchParams
        const params = new URLSearchParams(searchParams.toString())
        params.set("faculty", fac.value)
        params.delete("page") // reset page when filtering

        return (
          <Link
            key={fac.value}
            href={`${pathname}?${params.toString()}`}
            style={{ 
              background: isActive
                ? `radial-gradient(circle at top right, color-mix(in srgb, ${fac.color} 14%, transparent), transparent 38%), #18181B`
                : "#18181B",
              color: isActive ? "#F4F4F5" : undefined,
              borderColor: isActive ? fac.color : "#303036",
              boxShadow: isActive ? `inset 3px 0 0 0 ${fac.color}` : undefined,
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              isActive 
                ? "shadow-md scale-105" 
                : "text-muted-foreground hover:bg-[#202024] hover:text-foreground"
            }`}
          >
            {fac.adminLabel} ({fac.value})
          </Link>
        )
      })}
    </div>
  )
}
