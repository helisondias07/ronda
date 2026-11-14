export type StepId = "home" | "categoria" | "produto" | "carrinho" | "checkout";

export type StepResult = {
  id: StepId;
  url: string;
  pass: boolean;
  screenshot?: string;
  stopped_before_payment: boolean;
  error?: string;
  suggestion?: Suggestion;
};

export type Suggestion = {
  step: StepId;
  hypothesis: string;
  apply: false;
};

export type Skip = {
  available: false;
  reason: string;
};

export type LinkVerdict =
  | "ok"
  | "broken"
  | "skipped-external"
  | "skipped-ssrf"
  | "skipped-mailto"
  | "skipped-script"
  | "skipped-hash"
  | "limited";

export type LinkCheck = {
  href: string;
  status?: number;
  verdict: LinkVerdict;
};

export type InstitutionalPage = {
  slug: string;
  status?: number;
  pass: boolean;
  error?: string;
};

export type Report = {
  store: string;
  platform: "wake-mock" | "wake";
  target: "fixture" | "authorized-local";
  steps: StepResult[];
  stopped_before_payment: boolean;
  consoleErrors: string[];
  error?: string;
  detects_everything: false;
  links: LinkCheck[];
  institutional: InstitutionalPage[];
  figma: Skip;
  auth: Skip;
};

export type Target =
  | { kind: "fixture" }
  | { kind: "authorized-local"; url: string };
