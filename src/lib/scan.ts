import { isIP } from "node:net";
import { classifyFetchUrl } from "./ssrf";
import { LIMITS } from "./limits";
import type { InstitutionalPage, LinkCheck } from "./types";

const HREF_RE = /href\s*=\s*["']([^"']+)["']/gi;

export function extractHrefs(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(HREF_RE)) {
    if (match[1]) found.push(match[1]);
  }
  return found;
}

export function planLink(href: string, origin: string, allowLocal: boolean): LinkCheck {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return { href: trimmed, verdict: "skipped-hash" };
  }
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return { href: trimmed, verdict: "skipped-mailto" };
  }
  if (trimmed.startsWith("javascript:")) {
    return { href: trimmed, verdict: "skipped-script" };
  }
  let absolute: URL;
  try {
    absolute = new URL(trimmed, origin);
  } catch {
    return { href: trimmed, verdict: "skipped-ssrf" };
  }
  if (absolute.origin !== new URL(origin).origin) {
    const host = absolute.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) && !classifyFetchUrl(absolute.href, { allowLocal }).ok) {
      return { href: absolute.href, verdict: "skipped-ssrf" };
    }
    return { href: absolute.href, verdict: "skipped-external" };
  }
  const ssrf = classifyFetchUrl(absolute.href, { allowLocal });
  if (!ssrf.ok) {
    return { href: absolute.href, verdict: "skipped-ssrf" };
  }
  return { href: absolute.href, verdict: "ok" };
}

export function planLinks(hrefs: string[], origin: string, allowLocal: boolean): LinkCheck[] {
  const planned: LinkCheck[] = [];
  const seen = new Set<string>();
  for (const href of hrefs) {
    if (planned.length >= LIMITS.maxLinks) {
      planned.push({ href, verdict: "limited" });
      break;
    }
    const item = planLink(href, origin, allowLocal);
    const key = `${item.verdict}:${item.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    planned.push(item);
  }
  return planned;
}

type FetchLike = (url: string, init: { method: "GET"; redirect: "manual"; signal: AbortSignal }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
}>;

export async function checkPlanned(
  planned: LinkCheck[],
  fetchImpl: FetchLike,
): Promise<LinkCheck[]> {
  const out: LinkCheck[] = [];
  for (const item of planned) {
    if (item.verdict !== "ok") {
      out.push(item);
      continue;
    }
    const initial = planLink(item.href, item.href, true);
    if (initial.verdict !== "ok") {
      out.push({ ...item, verdict: initial.verdict });
      continue;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LIMITS.timeoutMs);
    try {
      let current = initial.href;
      let redirects = 0;
      const visited = new Set<string>();
      while (true) {
        if (visited.has(current)) {
          out.push({ ...item, verdict: "broken" });
          break;
        }
        visited.add(current);
        const res = await fetchImpl(current, {
          method: "GET",
          redirect: "manual",
          signal: ctrl.signal,
        });
        if (res.status < 300 || res.status >= 400) {
          out.push({ ...item, status: res.status, verdict: res.status >= 400 ? "broken" : "ok" });
          break;
        }
        const location = res.headers.get("location");
        if (!location || redirects >= LIMITS.maxRedirects) {
          out.push({ ...item, status: res.status, verdict: "broken" });
          break;
        }
        const next = planLink(location, current, true);
        if (next.verdict !== "ok") {
          out.push({ ...item, status: res.status, verdict: next.verdict });
          break;
        }
        current = next.href;
        redirects += 1;
      }
    } catch {
      out.push({ ...item, verdict: "broken" });
    } finally {
      clearTimeout(timer);
    }
  }
  return out;
}

export async function checkInstitutional(
  origin: string,
  slugs: string[],
  fetchImpl: FetchLike,
  allowLocal: boolean,
): Promise<InstitutionalPage[]> {
  const pages: InstitutionalPage[] = [];
  for (const slug of slugs.slice(0, LIMITS.maxPages)) {
    const href = new URL(slug, origin.endsWith("/") ? origin : `${origin}/`).href;
    const planned = planLink(href, origin, allowLocal);
    if (planned.verdict !== "ok") {
      pages.push({ slug, pass: false, error: planned.verdict });
      continue;
    }
    const [result] = await checkPlanned([planned], fetchImpl);
    pages.push({
      slug,
      status: result.status,
      pass: result.verdict === "ok" && (result.status || 0) < 400,
      error: result.verdict === "ok" ? undefined : result.verdict,
    });
  }
  return pages;
}
