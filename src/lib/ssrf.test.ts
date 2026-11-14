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
});
