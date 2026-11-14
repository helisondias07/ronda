export type StepId = "home" | "categoria" | "produto" | "carrinho" | "checkout";

export type ShotEvidence = {
  path: string;
  sha256: string;
  bytes: number;
  width?: number;
  height?: number;
  note: string;
};

export type StepResult = {
  id: StepId | string;
  url: string;
  pass: boolean;
  screenshot?: string;
  shotEvidence?: ShotEvidence;
  stopped_before_payment: boolean;
  error?: string;
  suggestion?: Suggestion;
  /** Aviso quando o JSON não trouxe um id de etapa conhecido. */
  formatWarning?: string;
};

export type Suggestion = {
  step: StepId | string;
  hypothesis: string;
  apply: false;
  kind?: "hypothesis";
};

export type PageFacts = {
  url: string;
  status?: number;
  title: string;
  h1: string;
  pass: boolean;
  suggestion?: Suggestion;
  accessibility?: {
    scope: "static-html-heuristic";
    findings: string[];
  };
};

export type IsolationNote = {
  hostedFetch: false;
  methods: "GET";
  figmaFaked: false;
  payment: false;
};

export type JourneyAction = {
  id: string;
  heading: string;
  click?: string;
  clickRole?: string;
  stop: boolean;
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
  /** Texto de `suggestion.text` (ou equivalente) no topo do JSON colado. */
  suggestionText?: string;
  error?: string;
  detects_everything: false;
  links: LinkCheck[];
  institutional: InstitutionalPage[];
  figma: Skip;
  auth: Skip;
  pages?: PageFacts[];
  isolation?: IsolationNote;
  visual?: VisualCompare[];
  journey?: {
    name: string;
    source: string;
    startPath: string;
    stepIds: string[];
    actions?: JourneyAction[];
    actionWarnings?: string[];
    stopBeforePayment: true;
  };
};

export type VisualBox = {
  path?: string;
  width?: number;
  height?: number;
};

export type VisualCompare = {
  source: "user-png";
  figma: false;
  step: string;
  viewport: { width?: number; height?: number };
  reference: VisualBox;
  actual: VisualBox;
  mismatchRatio?: number;
  diffPixels?: number;
  diffPath?: string;
  pass: boolean;
  hypothesis: string;
  apply: false;
  missing?: string[];
};

export type Target =
  | { kind: "fixture" }
  | { kind: "authorized-local"; url: string };
