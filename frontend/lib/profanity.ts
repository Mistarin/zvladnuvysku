const PROFANITY = new Set([
  'kurva', 'pica', 'picka', 'jebat', 'srat', 'hovno', 'debil', 'kreten',
  'idiot', 'blbec', 'pitomec', 'mrdat', 'kokot', 'zkurveny', 'zasrany',
  'posrany', 'hnup', 'vol', 'imbecil', 'tupohlav', 'blboun', 'svine',
  'prudit', 'prdelka', 'prdel', 'soustat', 'curak', 'hajzl', 'hajzle',
  'chcat', 'srác', 'kurevnik', 'devka', 'buzerant', 'teplous', 'smejd',
  'zasmradit', 'kokotina', 'kretenismus', 'blbost', 'posranec', 'sracka',
  'picovina', 'kurvin', 'zkurvit', 'zapicat', 'zasrat', 'posrat', 'nasrat',
  'dopicat', 'vypicat', 'srackovity',
])

export function containsProfanity(text: string): boolean {
  // Best-effort UX filter only; security and moderation decisions must use the approval flow.
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const words = normalized.split(/[\s,;.!?()\[\]{}]+/)
  return words.some(
    (w) => PROFANITY.has(w) || Array.from(PROFANITY).some((p) => w.includes(p))
  )
}
