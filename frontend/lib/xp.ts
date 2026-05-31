export interface ProfileProgress {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
}

export function getProfileProgress(totalXp: number): ProfileProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));

  return {
    totalXp: safeXp,
    level: Math.floor(safeXp / 100) + 1,
    currentLevelXp: safeXp % 100,
    nextLevelXp: 100,
  };
}
