import { describe, expect, it } from "vitest";
import { authSkip, figmaSkip } from "./gaps";

describe("gaps", () => {
  it("does not pretend Figma or login work", () => {
    const figma = figmaSkip({} as NodeJS.ProcessEnv);
    expect(figma.available).toBe(false);
    expect(figma.reason).toMatch(/Não fingimos/);
    const auth = authSkip();
    expect(auth.available).toBe(false);
    expect(auth.reason).toMatch(/não cria cadastro/);
  });
});
