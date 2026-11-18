import { describe, expect, it } from "vitest";
import { classifyFetchUrl, isForbiddenIpAddress, isPrivateIPv4 } from "./ssrf";

describe("ssrf", () => {
  it("blocks private, metadata and credentials", () => {
    expect(isPrivateIPv4("10.0.0.4")).toBe(true);
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
    expect(classifyFetchUrl("file:///etc/passwd", { allowLocal: false })).toEqual({
      ok: false,
      reason: "protocol",
    });
    expect(classifyFetchUrl("http://user:pass@example.com", { allowLocal: false })).toEqual({
      ok: false,
      reason: "credential",
    });
    expect(classifyFetchUrl("http://169.254.169.254/latest", { allowLocal: true })).toEqual({
      ok: false,
      reason: "metadata",
    });
    expect(classifyFetchUrl("http://127.0.0.1/x", { allowLocal: false })).toEqual({
      ok: false,
      reason: "private",
    });
    expect(classifyFetchUrl("http://127.0.0.1/x", { allowLocal: true })).toEqual({ ok: true });
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

  it("validates public vs forbidden IPv4 and IPv6 addresses for DNS pinning", () => {
    for (const forbidden of [
      "0.0.0.0",
      "127.0.0.1",
      "10.0.0.8",
      "100.64.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.0.1",
      "224.0.0.1",
      "::",
      "::1",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "fe80::1%eth0",
      "ff02::1",
      "::ffff:127.0.0.1",
      "::ffff:169.254.169.254",
      "::ffff:7f00:1",
      "64:ff9b::169.254.169.254",
      "2002:7f00:0001::1",
      "2001:db8::1",
      "not-an-ip",
    ]) {
      expect(isForbiddenIpAddress(forbidden), forbidden).toBe(true);
    }
    for (const pub of ["93.184.216.34", "1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) {
      expect(isForbiddenIpAddress(pub), pub).toBe(false);
    }
  });
});
