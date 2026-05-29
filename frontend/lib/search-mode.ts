export type SearchMode = "subjects" | "flashcards" | "materials";

export interface ParsedSearchMode {
  mode: SearchMode;
  modeQuery: string;
}

const MODE_PREFIXES: Record<string, SearchMode> = {
  f: "flashcards",
  m: "materials",
};

export function parseSearchMode(query: string): ParsedSearchMode {
  const trimmedStart = query.trimStart();

  if (!trimmedStart.startsWith(".")) {
    return {
      mode: "subjects",
      modeQuery: query.trim(),
    };
  }

  const match = trimmedStart.match(/^\.([a-zA-Z])(.*)$/);
  if (!match) {
    return {
      mode: "subjects",
      modeQuery: query.trim(),
    };
  }

  const prefix = match[1].toLowerCase();
  const mode = MODE_PREFIXES[prefix];

  if (!mode) {
    return {
      mode: "subjects",
      modeQuery: query.trim(),
    };
  }

  return {
    mode,
    modeQuery: match[2].trim(),
  };
}
