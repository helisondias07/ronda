export type ScribanCheck = { ok: true } | { ok: false; message: string };

export function detectScribanError(body: string): ScribanCheck {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return { ok: true };
  try {
    const json = JSON.parse(trimmed) as { status_code?: number; message?: string };
    if (json.status_code === 500) {
      return {
        ok: false,
        message: json.message || "Scriban status_code 500",
      };
    }
  } catch {
    return { ok: true };
  }
  return { ok: true };
}
