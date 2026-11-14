const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const METADATA_HOSTS = new Set(["metadata.google.internal", "metadata.goog"]);

export type SsrfVerdict =
  | { ok: true }
  | { ok: false; reason: "protocol" | "credential" | "private" | "metadata" };

export function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const oct = m.slice(1).map(Number);
  if (oct.some((n) => n > 255)) return false;
  const [a, b] = oct;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function classifyFetchUrl(href: string, opts: { allowLocal: boolean }): SsrfVerdict {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { ok: false, reason: "protocol" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "protocol" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "credential" };
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (METADATA_HOSTS.has(host) || host === "169.254.169.254") {
    return { ok: false, reason: "metadata" };
  }
  if (isPrivateIPv4(host) || host.endsWith(".internal")) {
    if (opts.allowLocal && LOCAL_HOSTS.has(host)) return { ok: true };
    return { ok: false, reason: "private" };
  }
  if (LOCAL_HOSTS.has(host) && !opts.allowLocal) {
    return { ok: false, reason: "private" };
  }
  return { ok: true };
}
