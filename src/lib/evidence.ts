import { createHash } from "node:crypto";
import fs from "node:fs";
import type { ShotEvidence } from "./types";

export type { ShotEvidence };

const LOCAL_NOTE = "print local no PC; o visor Hobby não busca nem publica este arquivo";

/** Lê IHDR de PNG sem dependência extra. */
export function pngDimensions(buf: Uint8Array): { width: number; height: number } | undefined {
  if (buf.length < 24) return undefined;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i += 1) {
    if (buf[i] !== sig[i]) return undefined;
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function describeShotBuffer(filePath: string, buf: Uint8Array): ShotEvidence {
  const dim = pngDimensions(buf);
  return {
    path: filePath,
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    width: dim?.width,
    height: dim?.height,
    note: LOCAL_NOTE,
  };
}

export function describeShotFile(filePath: string): ShotEvidence {
  return describeShotBuffer(filePath, fs.readFileSync(filePath));
}
