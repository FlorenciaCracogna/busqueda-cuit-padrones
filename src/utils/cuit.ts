export function normalizeCuit(raw: string): string {
  return raw.replace(/[-.\s]/g, '');
}

export function isValidCuit(cuit: string): boolean {
  const clean = normalizeCuit(cuit);
  if (!/^\d{11}$/.test(clean)) return false;
  return true;
}

export function formatCuit(cuit: string): string {
  const clean = normalizeCuit(cuit);
  if (clean.length === 11) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  }
  return clean;
}

export interface ParsedCuitList {
  cuits: string[];
  duplicates: string[];
  invalid: string[];
}

export function parseCuitList(text: string): ParsedCuitList {
  const tokens = text
    .split(/[\n,;\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const invalid: string[] = [];
  const result: string[] = [];

  for (const token of tokens) {
    const clean = normalizeCuit(token);
    if (seen.has(clean)) {
      duplicates.add(clean);
      continue;
    }
    seen.add(clean);
    if (!/^\d{11}$/.test(clean)) {
      invalid.push(token);
      continue;
    }
    result.push(clean);
  }

  return {
    cuits: result,
    duplicates: Array.from(duplicates),
    invalid,
  };
}
