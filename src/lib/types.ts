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

export type Report = {
  store: string;
  platform: "wake-mock" | "wake";
  target: "fixture" | "authorized-local";
  steps: StepResult[];
  stopped_before_payment: boolean;
  consoleErrors: string[];
  error?: string;
};

export type Target =
  | { kind: "fixture" }
  | { kind: "authorized-local"; url: string };
