import { headers } from 'next/headers'

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`

  return withProtocol.endsWith('/') ? withProtocol.slice(0, -1) : withProtocol
}

export async function getRequestOrigin() {
  const envUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      '',
  )

  if (envUrl) {
    return new URL(envUrl).origin
  }

  const headerStore = await headers()
  const forwardedProto = headerStore.get('x-forwarded-proto')
  const forwardedHost = headerStore.get('x-forwarded-host')
  const host = forwardedHost ?? headerStore.get('host')

  if (host) {
    return `${forwardedProto ?? 'https'}://${host}`
  }

  return 'http://localhost:3000'
}
