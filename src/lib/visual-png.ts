import fs from "node:fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export type Viewport = { width: number; height: number };

export type VisualResult = {
  source: "user-png";
  figma: false;
  step: string;
  viewport: Viewport;
  reference: { path: string; width: number; height: number };
  actual: { path: string; width: number; height: number };
  mismatchRatio?: number;
  diffPixels?: number;
  diffPath?: string;
  pass: boolean;
  hypothesis: string;
  apply: false;
};

export function parseViewport(raw?: string): Viewport {
  const m = /^(\d{2,4})x(\d{2,4})$/.exec((raw || "1280x720").trim());
  if (!m) {
    throw new Error("viewport inválido; use por exemplo 1280x720");
  }
  return { width: Number(m[1]), height: Number(m[2]) };
}

function dimNote(label: string, w: number, h: number, viewport: Viewport): string | null {
  if (w !== viewport.width || h !== viewport.height) {
    return `${label} ${w}×${h} ≠ viewport ${viewport.width}×${viewport.height}`;
  }
  return null;
}

export function comparePngFiles(opts: {
  step: string;
  actualPath: string;
  referencePath: string;
  viewport: Viewport;
  diffPath: string;
  threshold?: number;
}): VisualResult {
  const actualPng = PNG.sync.read(fs.readFileSync(opts.actualPath));
  const referencePng = PNG.sync.read(fs.readFileSync(opts.referencePath));
  const base = {
    source: "user-png" as const,
    figma: false as const,
    step: opts.step,
    viewport: opts.viewport,
    reference: { path: opts.referencePath, width: referencePng.width, height: referencePng.height },
    actual: { path: opts.actualPath, width: actualPng.width, height: actualPng.height },
    apply: false as const,
  };
  const mismatches = [
    dimNote("captura", actualPng.width, actualPng.height, opts.viewport),
    dimNote("referência", referencePng.width, referencePng.height, opts.viewport),
  ].filter(Boolean);
  if (mismatches.length) {
    return {
      ...base,
      pass: false,
      hypothesis: `Hipótese: ${mismatches.join("; ")}. Não redimensionamos para fingir match com Figma ou com a captura.`,
    };
  }
  const diff = new PNG({ width: opts.viewport.width, height: opts.viewport.height });
  const diffPixels = pixelmatch(
    new Uint8Array(actualPng.data),
    new Uint8Array(referencePng.data),
    new Uint8Array(diff.data.buffer, diff.data.byteOffset, diff.data.byteLength),
    opts.viewport.width,
    opts.viewport.height,
    { threshold: opts.threshold ?? 0.1 },
  );
  fs.writeFileSync(opts.diffPath, PNG.sync.write(diff));
  const mismatchRatio = diffPixels / (opts.viewport.width * opts.viewport.height);
  const pass = mismatchRatio <= 0.02;
  return {
    ...base,
    mismatchRatio,
    diffPixels,
    diffPath: opts.diffPath,
    pass,
    hypothesis: pass
      ? "PNG de referência e captura batem no viewport informado. Não é Figma."
      : `Hipótese: ${diffPixels} px diferentes (${(mismatchRatio * 100).toFixed(2)}% do viewport ${opts.viewport.width}×${opts.viewport.height}). apply: false; não é Figma.`,
  };
}
