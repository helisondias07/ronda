const THIRD_PARTY = /googletagmanager|google-analytics|facebook\.net|connect\.facebook|hotjar|clarity\.ms/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SECRET = /\bsk-[A-Za-z0-9_-]{8,}\b/g;

export function maskConsole(text: string): string {
  return text.replace(SECRET, "sk-…").replace(EMAIL, "***@***");
}

export function isFirstPartyConsoleError(text: string, pageHost: string): boolean {
  if (THIRD_PARTY.test(text)) return false;
  if (/https?:\/\//i.test(text) && pageHost && !text.includes(pageHost)) {
    return false;
  }
  return true;
}

export function filterConsole(errors: string[], pageHost: string): string[] {
  return errors.filter((text) => isFirstPartyConsoleError(text, pageHost)).map(maskConsole);
}
