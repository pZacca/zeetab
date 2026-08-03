export function resolveFaviconUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`;
  } catch {
    return undefined;
  }
}

export function hashToColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = Math.trunc(hash * 31 + (input.codePointAt(i) ?? 0));
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}

export function initialOf(label: string, hostname = ""): string {
  const src = (label || hostname).trim();
  if (!src) return "?";
  return src.charAt(0).toUpperCase();
}
