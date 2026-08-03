import { describe, expect, it } from "vitest";
import { resolveFaviconUrl, hashToColor, initialOf } from "./favicon";

describe("resolveFaviconUrl", () => {
  it("returns DuckDuckGo URL for a valid URL", () => {
    expect(resolveFaviconUrl("https://github.com/foo")).toBe(
      "https://icons.duckduckgo.com/ip3/github.com.ico"
    );
  });

  it("strips subdomain-less hostnames correctly", () => {
    expect(resolveFaviconUrl("https://www.example.co.uk/")).toBe(
      "https://icons.duckduckgo.com/ip3/www.example.co.uk.ico"
    );
  });

  it("returns undefined for invalid input", () => {
    expect(resolveFaviconUrl("not a url")).toBeUndefined();
    expect(resolveFaviconUrl("")).toBeUndefined();
  });
});

describe("hashToColor", () => {
  it("is deterministic", () => {
    expect(hashToColor("github.com")).toBe(hashToColor("github.com"));
  });

  it("returns a valid HSL string", () => {
    expect(hashToColor("github.com")).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
  });

  it("differs for different hosts", () => {
    expect(hashToColor("github.com")).not.toBe(hashToColor("youtube.com"));
  });
});

describe("initialOf", () => {
  it("returns uppercase first letter of a label", () => {
    expect(initialOf("github")).toBe("G");
  });

  it("falls back to hostname initial when label empty", () => {
    expect(initialOf("", "github.com")).toBe("G");
  });

  it("returns ? when everything is empty", () => {
    expect(initialOf("", "")).toBe("?");
  });
});
