function normalizeSiteUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ""
  }

  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`

  return withProtocol.endsWith("/") ? withProtocol.slice(0, -1) : withProtocol
}

export function getSiteUrl() {
  const envUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "",
  )

  if (envUrl) {
    return envUrl
  }

  if (typeof window !== "undefined") {
    return normalizeSiteUrl(window.location.origin)
  }

  return "http://localhost:3000"
}

export function getAuthCallbackUrl(next = "/") {
  const url = new URL("/auth/callback", getSiteUrl())

  if (next.startsWith("/")) {
    url.searchParams.set("next", next)
  }

  return url.toString()
}
