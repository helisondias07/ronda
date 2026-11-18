import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { comparePngFiles, parseViewport } from "./visual-png";

function solidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      png.data[i] = rgb[0];
      png.data[i + 1] = rgb[1];
      png.data[i + 2] = rgb[2];
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

function withVisTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ronda-vis-"));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("visual-png", () => {
  it("recusa viewport inválido e dimensão diferente sem reescalar", () => {
    expect(() => parseViewport("abc")).toThrow(/viewport/);
    expect(parseViewport("1280x720")).toEqual({ width: 1280, height: 720 });
    withVisTempDir((dir) => {
      const actual = path.join(dir, "actual.png");
      const reference = path.join(dir, "ref.png");
      fs.writeFileSync(actual, solidPng(10, 10, [0, 0, 0]));
      fs.writeFileSync(reference, solidPng(12, 10, [0, 0, 0]));
      const result = comparePngFiles({
        step: "home",
        actualPath: actual,
        referencePath: reference,
        viewport: { width: 10, height: 10 },
        diffPath: path.join(dir, "diff.png"),
      });
      expect(result.pass).toBe(false);
      expect(result.figma).toBe(false);
      expect(result.hypothesis).toMatch(/não redimensionamos/i);
      expect(result.diffPath).toBeUndefined();
    });
  });

  it("compara dois PNG iguais no viewport", () => {
    withVisTempDir((dir) => {
      const actual = path.join(dir, "actual.png");
      const reference = path.join(dir, "ref.png");
      const buf = solidPng(8, 8, [20, 40, 60]);
      fs.writeFileSync(actual, buf);
      fs.writeFileSync(reference, buf);
      const result = comparePngFiles({
        step: "home",
        actualPath: actual,
        referencePath: reference,
        viewport: { width: 8, height: 8 },
        diffPath: path.join(dir, "diff.png"),
      });
      expect(result.pass).toBe(true);
      expect(result.mismatchRatio).toBe(0);
      expect(result.source).toBe("user-png");
    });
  });

  it("grava PNG de diff legível quando os pixels diferem", () => {
    withVisTempDir((dir) => {
      const actual = path.join(dir, "actual.png");
      const reference = path.join(dir, "ref.png");
      const diffPath = path.join(dir, "diff.png");
      fs.writeFileSync(actual, solidPng(8, 8, [255, 0, 0]));
      fs.writeFileSync(reference, solidPng(8, 8, [0, 0, 255]));
      const result = comparePngFiles({
        step: "home",
        actualPath: actual,
        referencePath: reference,
        viewport: { width: 8, height: 8 },
        diffPath,
      });
      expect(result.pass).toBe(false);
      expect(result.diffPath).toBe(diffPath);
      expect(fs.existsSync(diffPath)).toBe(true);
      const png = PNG.sync.read(fs.readFileSync(diffPath));
      expect(png.width).toBe(8);
      expect(png.height).toBe(8);
      expect(png.data.byteLength).toBe(8 * 8 * 4);
    });
  });
});
