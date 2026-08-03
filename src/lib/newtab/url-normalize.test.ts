import { describe, expect, it } from "vitest";
import { hostnameOf, normalizeUrl } from "./url-normalize";

describe("normalizeUrl", () => {
  it("prepends https:// to a bare host", () => {
    expect(normalizeUrl("github.com")).toEqual({ ok: true, url: "https://github.com/" });
  });

  it("preserves https://", () => {
    expect(normalizeUrl("https://github.com")).toEqual({
      ok: true,
      url: "https://github.com/",
    });
  });

  it("preserves http://", () => {
    expect(normalizeUrl("http://localhost:3000")).toEqual({
      ok: true,
      url: "http://localhost:3000/",
    });
  });

  it("keeps paths and query strings", () => {
    expect(normalizeUrl("github.com/pZacca?tab=repos")).toEqual({
      ok: true,
      url: "https://github.com/pZacca?tab=repos",
    });
  });

  it("rejects javascript: URLs", () => {
    expect(normalizeUrl("javascript:alert(1)")).toEqual({
      ok: false,
      reason: "only http and https are allowed",
    });
  });

  it("rejects file:// URLs", () => {
    expect(normalizeUrl("file:///etc/passwd")).toEqual({
      ok: false,
      reason: "only http and https are allowed",
    });
  });

  it("rejects empty input", () => {
    expect(normalizeUrl("")).toEqual({ ok: false, reason: "URL is required" });
    expect(normalizeUrl("   ")).toEqual({ ok: false, reason: "URL is required" });
  });

  it("rejects malformed URLs", () => {
    expect(normalizeUrl("not a url")).toEqual({
      ok: false,
      reason: "URL is not valid",
    });
  });
});

describe("hostnameOf", () => {
  it("returns the hostname of a valid URL", () => {
    expect(hostnameOf("https://github.com/path?x=1")).toBe("github.com");
  });

  it("returns the raw input when URL parsing fails", () => {
    expect(hostnameOf("not a url")).toBe("not a url");
    expect(hostnameOf("")).toBe("");
  });
});
