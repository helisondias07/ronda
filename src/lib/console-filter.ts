const THIRD_PARTY = /googletagmanager|google-analytics|facebook\.net|connect\.facebook|hotjar|clarity\.ms/i;

export function isFirstPartyConsoleError(text: string, pageHost: string): boolean {
  if (THIRD_PARTY.test(text)) return false;
  if (/https?:\/\//i.test(text) && pageHost && !text.includes(pageHost)) {
    return false;
  }
  return true;
}

export function filterConsole(errors: string[], pageHost: string): string[] {
  return errors.filter((text) => isFirstPartyConsoleError(text, pageHost));
}
