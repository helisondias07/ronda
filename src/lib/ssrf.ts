import { isIP } from "node:net";

const METADATA_HOSTS = new Set(["metadata.google.internal", "metadata.goog", "instance-data"]);

export type SsrfVerdict =
  | { ok: true }
  | { ok: false; reason: "protocol" | "credential" | "private" | "metadata" };

export function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const oct = m.slice(1).map(Number);
  if (oct.some((n) => n > 255)) return false;
  const [a, b, c] = oct;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function parseIpv6Groups(ip: string): number[] | null {
  let normalized = ip.toLowerCase();
  const lastColon = normalized.lastIndexOf(":");
  if (lastColon !== -1 && normalized.includes(".")) {
    const v4Part = normalized.slice(lastColon + 1);
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v4Part);
    if (!m) return null;
    const oct = m.slice(1).map(Number);
    if (oct.some((n) => n > 255)) return null;
    const hi = ((oct[0] << 8) | oct[1]).toString(16);
    const lo = ((oct[2] << 8) | oct[3]).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${hi}:${lo}`;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = halves.length === 2 ? 8 - (left.length + right.length) : 0;
  if ((halves.length === 1 && left.length !== 8) || missing < 0) return null;
  const full = halves.length === 2 ? [...left, ...Array(missing).fill("0"), ...right] : left;
  if (full.length !== 8) return null;
  const nums = full.map((part) => (/^[0-9a-f]{1,4}$/.test(part) ? parseInt(part, 16) : NaN));
  return nums.some(Number.isNaN) ? null : nums;
}

function ipv4FromGroups(hi: number, lo: number): string {
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/** Retorna true para qualquer IP não roteável publicamente (loopback, RFC1918, CGNAT, link-local, IMDS, ULA, NAT64, 6to4, Teredo, multicast). */
export function isForbiddenIpAddress(rawIp: string): boolean {
  const cleaned = rawIp.trim().replace(/^\[|\]$/g, "");
  if (!cleaned || cleaned.includes("%")) return true;
  const version = isIP(cleaned);
  if (version === 4) return isPrivateIPv4(cleaned);
  if (version !== 6) return true;
  const g = parseIpv6Groups(cleaned);
  if (!g) return true;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g;
  const allZeroPrefix = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0;
  // :: (unspecified), ::1 (loopback), IPv4-compatible ::w.x.y.z
  if (allZeroPrefix && g5 === 0) {
    if (g6 === 0 && (g7 === 0 || g7 === 1)) return true;
    return isPrivateIPv4(ipv4FromGroups(g6, g7));
  }
  // ::ffff:w.x.y.z (IPv4-mapped) or ::ffff:0:w.x.y.z (IPv4-translated)
  if (allZeroPrefix && g5 === 0xffff) return isPrivateIPv4(ipv4FromGroups(g6, g7));
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0xffff && g5 === 0) {
    return isPrivateIPv4(ipv4FromGroups(g6, g7));
  }
  // NAT64 (64:ff9b::/96 and 64:ff9b:1::/48)
  if (g0 === 0x0064 && g1 === 0xff9b) return true;
  // 6to4 (2002::/16) embeds IPv4 in g1:g2
  if (g0 === 0x2002) return isPrivateIPv4(ipv4FromGroups(g1, g2));
  // Teredo (2001:0000::/32) and Documentation (2001:0db8::/32)
  if (g0 === 0x2001 && (g1 === 0x0000 || g1 === 0x0db8)) return true;
  // Unique Local fc00::/7, Link-Local fe80::/10, Multicast ff00::/8
  if ((g0 & 0xfe00) === 0xfc00) return true;
  if ((g0 & 0xffc0) === 0xfe80) return true;
  if ((g0 & 0xff00) === 0xff00) return true;
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
  if (METADATA_HOSTS.has(host) || host === "169.254.169.254" || host === "fd00:ec2::254") {
    return { ok: false, reason: "metadata" };
  }
  // Only literal loopback is permitted. DNS names are denied to prevent rebinding.
  if (opts.allowLocal && (host === "127.0.0.1" || host === "::1") && isIP(host)) return { ok: true };
  return { ok: false, reason: "private" };
}
