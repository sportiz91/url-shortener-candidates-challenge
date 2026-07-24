import { describe, expect, it } from "vitest";
import { OriginalUrl } from "./original-url";

describe("OriginalUrl", () => {
  it("accepts a valid https URL and normalizes it", () => {
    const result = OriginalUrl.create("  HTTPS://Example.COM/Path?q=1 ");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.value).toBe("https://example.com/Path?q=1");
  });

  it("accepts plain http URLs", () => {
    const result = OriginalUrl.create("http://example.com");

    expect(result.ok).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = OriginalUrl.create("   ");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("invalid-url");
  });

  it("rejects a URL without a protocol", () => {
    const result = OriginalUrl.create("example.com/some/path");

    expect(result.ok).toBe(false);
  });

  it.each(["javascript:alert(1)", "ftp://example.com/file", "data:text/html,hi"])(
    "rejects non-http(s) scheme: %s",
    (rawUrl) => {
      const result = OriginalUrl.create(rawUrl);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.type).toBe("invalid-url");
    },
  );

  it("rejects URLs with embedded credentials", () => {
    const result = OriginalUrl.create("https://user:secret@example.com");

    expect(result.ok).toBe(false);
  });

  it("rejects URLs longer than 2048 characters", () => {
    const oversized = `https://example.com/${"a".repeat(2100)}`;

    const result = OriginalUrl.create(oversized);

    expect(result.ok).toBe(false);
  });

  it("rejects hosts on the blocklist, preventing self-shortening loops", () => {
    const result = OriginalUrl.create("http://localhost:3000/s/abc1234", {
      blockedHosts: ["localhost:3000"],
    });

    expect(result.ok).toBe(false);
  });
});
