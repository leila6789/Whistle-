const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

export function lastName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return full.trim();
  let index = parts.length - 1;
  if (SUFFIX.test(parts[index]) && index > 0) index -= 1;
  return parts[index];
}

export function bold(name: string): string {
  return `**${name}**`;
}

export function plain(text: string): string {
  return text.replace(/\*\*/g, "");
}

export function unique(values: (string | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Wrap known names so a plain rephrase can still emphasize who did it. */
export function emphasize(text: string, names: string[]): string {
  const sorted = unique(names).sort((a, b) => b.length - a.length);
  let next = text;
  for (const name of sorted) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`\\b${escaped}\\b`, "g"), `**${name}**`);
  }
  return next;
}
