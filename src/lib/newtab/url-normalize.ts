export type NormalizeResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

export function normalizeUrl(input: string): NormalizeResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "URL is required" };

  const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasProtocol ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "URL is not valid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "only http and https are allowed" };
  }

  return { ok: true, url: parsed.toString() };
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
