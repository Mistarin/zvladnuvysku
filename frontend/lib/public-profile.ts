export function getPublicProfilePath(userId: string): string {
  return `/profil/${userId}`;
}

export function getPublicProfileContributionsPath(userId: string): string {
  return `/profil/${userId}/prispevky`;
}
