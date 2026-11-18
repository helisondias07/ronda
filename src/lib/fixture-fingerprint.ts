import { createHash } from "node:crypto";

/** Digest determinístico do conjunto local de arquivos usados pela demo. Não atesta isolamento de rede. */
export function fixtureFingerprint(files: Array<{ name: string; content: Uint8Array }>): string {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const names = new Set<string>();
  const hash = createHash("sha256");
  for (const file of sorted) {
    const invalidName = !file.name
      || file.name.startsWith("/")
      || /^[a-z]:[\\/]/i.test(file.name)
      || file.name.split(/[\\/]/).includes("..")
      || names.has(file.name);
    if (invalidName) {
      throw new Error("fixture fingerprint: nome de arquivo inválido ou repetido");
    }
    names.add(file.name);
    hash.update(file.name.replace(/\\/g, "/")).update("\0");
    hash.update(String(file.content.byteLength)).update("\0").update(file.content).update("\0");
  }
  return hash.digest("hex");
}
