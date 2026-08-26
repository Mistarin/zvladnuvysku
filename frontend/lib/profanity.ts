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

// Stems shorter than this are only matched as whole words — e.g. "vol" must
// never swallow "volební", while longer stems still catch common Czech
// inflections ("debil" -> "debile", "debilní").
const MIN_PREFIX_STEM_LENGTH = 5

export function containsProfanity(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s,;.!?()\[\]{}:-]+/g, '|')
  const words = normalized.split('|')
  return words.some(
    (word) =>
      PROFANITY.has(word) ||
      Array.from(PROFANITY).some(
        (stem) => stem.length >= MIN_PREFIX_STEM_LENGTH && word.startsWith(stem),
      ),
  )
}
