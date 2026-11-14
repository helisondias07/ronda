const COMPLETE_PATH = /checkout\/(complete|confirmation)|checkoutcomplete/i;

export function isPaymentCompletePath(pathname: string): boolean {
  return COMPLETE_PATH.test(pathname);
}

export function isForbiddenMutation(name: string): boolean {
  return name === "checkoutComplete";
}

export function isAllowedBrowserRequest(input: {
  requestUrl: string;
  origin: string;
  method: string;
}): boolean {
  try {
    const url = new URL(input.requestUrl);
    return url.origin === input.origin && input.method === "GET" && !isPaymentCompletePath(url.pathname);
  } catch {
    return false;
  }
}

export function assertNotPaid(input: {
  pathname: string;
  cardValue: string;
  mutations: string[];
}): void {
  if (isPaymentCompletePath(input.pathname)) {
    throw new Error("política: caminho de pedido concluído — a Ronda para antes de pagar");
  }
  if (input.cardValue.trim()) {
    throw new Error("política: campo de cartão foi preenchido — a Ronda não paga");
  }
  for (const name of input.mutations) {
    if (isForbiddenMutation(name)) {
      throw new Error("política: mutation checkoutComplete é proibida");
    }
  }
}

export function assertReportOnly(wroteThemeFile: boolean): void {
  if (wroteThemeFile) {
    throw new Error("política: a Ronda só relata; não grava Pages/ nem Components/");
  }
}
