const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

type BrevoRecipient = {
  email: string
  name?: string
}

type BrevoEmail = {
  sender: BrevoRecipient
  to: BrevoRecipient[]
  cc?: BrevoRecipient[]
  subject: string
  htmlContent: string
  textContent?: string
}

type ParsedAddress = BrevoRecipient

function parseAddress(value: string): ParsedAddress | null {
  const trimmed = value.trim()
  const named = trimmed.match(/^(.+?)\s*<([^<>\s]+@[^<>\s]+)>$/)
  const email = named?.[2] ?? trimmed

  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null

  return named ? { email, name: named[1].trim() } : { email }
}

function parseAddresses(value: string | undefined): BrevoRecipient[] {
  return (value ?? '')
    .split(',')
    .map(parseAddress)
    .filter((address): address is ParsedAddress => address !== null)
}

function requiredAddress(name: string): BrevoRecipient | null {
  const value = process.env[name]
  return value ? parseAddress(value) : null
}

export function isBrevoConfigured() {
  return Boolean(
    process.env.BREVO_API_KEY &&
      requiredAddress('MAIL_FROM') &&
      parseAddresses(process.env.MAIL_TO_PUBLIC).length > 0,
  )
}

export async function sendBrevoEmail(email: Omit<BrevoEmail, 'sender' | 'to' | 'cc'> & {
  to?: BrevoRecipient[]
  cc?: BrevoRecipient[]
}) {
  const apiKey = process.env.BREVO_API_KEY
  const sender = requiredAddress('MAIL_FROM')
  const to = email.to ?? parseAddresses(process.env.MAIL_TO_PUBLIC)
  const cc = email.cc ?? parseAddresses(process.env.MAIL_TO_PRIVATE_CC)

  if (!apiKey || !sender || to.length === 0) {
    return { sent: false, skipped: true, reason: 'Brevo email is not configured.' }
  }

  const payload: BrevoEmail = {
    sender,
    to,
    subject: email.subject,
    htmlContent: email.htmlContent,
    ...(email.textContent ? { textContent: email.textContent } : {}),
    ...(cc.length > 0 ? { cc } : {}),
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Brevo API ${response.status}: ${details.slice(0, 500)}`)
  }

  return { sent: true, skipped: false }
}

export function escapeEmailHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] ?? character,
  )
}
