import { describe, expect, it } from "vitest";
import { describeShotBuffer, pngDimensions } from "./evidence";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("evidence", () => {
  it("mede PNG e grava hash sem embutir a foto", () => {
    const dim = pngDimensions(PNG_1X1);
    expect(dim).toEqual({ width: 1, height: 1 });
    const shot = describeShotBuffer("ronda-out/home.png", PNG_1X1);
    expect(shot.bytes).toBe(PNG_1X1.length);
    expect(shot.sha256).toHaveLength(64);
    expect(shot.note).toMatch(/não busca/);
    expect(JSON.stringify(shot)).not.toMatch(/data:image/);
  });
});
