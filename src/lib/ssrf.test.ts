import { describe, expect, it } from "vitest";
import { classifyFetchUrl, isPrivateIPv4 } from "./ssrf";

describe("ssrf", () => {
  it("blocks private, metadata and credentials", () => {
    expect(isPrivateIPv4("10.0.0.4")).toBe(true);
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
    expect(classifyFetchUrl("file:///etc/passwd", { allowLocal: false }).ok).toBe(false);
    expect(classifyFetchUrl("http://user:pass@example.com", { allowLocal: false }).reason).toBe(
      "credential",
    );
    expect(classifyFetchUrl("http://169.254.169.254/latest", { allowLocal: true }).reason).toBe(
      "metadata",
    );
    expect(classifyFetchUrl("http://127.0.0.1/x", { allowLocal: false }).reason).toBe("private");
    expect(classifyFetchUrl("http://127.0.0.1/x", { allowLocal: true }).ok).toBe(true);
  });

  it("blocks private IPv4, IPv6 and IPv4-mapped IPv6 even with local access", () => {
    for (const href of [
      "http://10.0.0.1/",
      "http://169.254.169.254/",
      "http://[fc00::1]/",
      "http://[fe80::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:169.254.169.254]/",
    ]) {
      expect(classifyFetchUrl(href, { allowLocal: true }).ok, href).toBe(false);
    }
  });

  it("refuses DNS hostnames before resolution, including a public-to-private rebinding name", () => {
    expect(classifyFetchUrl("https://public-rebind.example/", { allowLocal: true })).toEqual({
      ok: false,
      reason: "private",
    });
  });
});
