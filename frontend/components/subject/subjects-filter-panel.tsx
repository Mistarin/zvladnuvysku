"use client";

import { SearchFilters } from "@/components/search/search-filters";
import { useSubjectFilters } from "@/hooks/use-subject-filters";

export function SubjectsFilterPanel() {
  const {
    filters,
    setFilter,
    resetFilters,
    filterConfig,
    activeFilterCount,
  } = useSubjectFilters();

  return (
    <SearchFilters
      filters={filters}
      filterConfig={filterConfig}
      onFilterChange={setFilter}
      onReset={resetFilters}
      activeFilterCount={activeFilterCount}
    />
  );
}
