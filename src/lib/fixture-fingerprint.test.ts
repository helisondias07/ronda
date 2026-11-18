import { describe, expect, it } from "vitest";
import { fixtureFingerprint } from "./fixture-fingerprint";

describe("fingerprint do fixture", () => {
  it("é estável independente da ordem e muda quando o conteúdo muda", () => {
    const files = [
      { name: "home.html", content: Buffer.from("home") },
      { name: "shop.css", content: Buffer.from("style") },
    ];
    expect(fixtureFingerprint(files)).toBe(fixtureFingerprint([...files].reverse()));
    expect(fixtureFingerprint(files)).not.toBe(fixtureFingerprint([{ ...files[0], content: Buffer.from("changed") }, files[1]]));
    expect(fixtureFingerprint(files)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("recusa nomes repetidos e traversal", () => {
    expect(() => fixtureFingerprint([{ name: "../secret", content: Buffer.from("x") }])).toThrow(/inválido/);
    expect(() => fixtureFingerprint([{ name: "C:\\secret", content: Buffer.from("x") }])).toThrow(/inválido/);
    expect(() => fixtureFingerprint([
      { name: "home.html", content: Buffer.from("a") },
      { name: "home.html", content: Buffer.from("b") },
    ])).toThrow(/inválido/);
  });
});
