import { describe, expect, it } from "vitest";
import { OriginalUrl } from "../domain/original-url";
import { ShortCode } from "../domain/short-code";
import { ShortenedUrl } from "../domain/shortened-url";
import type { Clock } from "./ports";
import { ResolveShortCode } from "./resolve-short-code";
import { InMemoryUrlRepository } from "./testing/in-memory-url-repository";

const NOW = new Date("2026-07-24T12:00:00.000Z");
const fixedClock: Clock = { now: () => NOW };

async function buildResolver(seed?: { url: string; code: string }) {
  const repository = new InMemoryUrlRepository();
  if (seed) {
    const url = OriginalUrl.create(seed.url);
    const code = ShortCode.create(seed.code);
    if (!url.ok || !code.ok) throw new Error("Invalid test fixture");
    await repository.save(ShortenedUrl.create(code.value, url.value, NOW));
  }
  return { useCase: new ResolveShortCode({ repository, clock: fixedClock }), repository };
}

describe("ResolveShortCode", () => {
  it("resolves an existing code and registers the click", async () => {
    const { useCase, repository } = await buildResolver({
      url: "https://example.com/target",
      code: "abc1234",
    });

    const result = await useCase.execute("abc1234", { trackClick: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.targetUrl).toBe("https://example.com/target");

    const codeResult = ShortCode.create("abc1234");
    if (!codeResult.ok) throw new Error("Invalid test fixture");
    const stored = await repository.findByCode(codeResult.value);
    expect(stored?.clickCount).toBe(1);
    expect(stored?.lastClickedAt).toEqual(NOW);
  });

  it("does not register a click when tracking is off (e.g. bot traffic)", async () => {
    const { useCase, repository } = await buildResolver({
      url: "https://example.com/target",
      code: "abc1234",
    });

    await useCase.execute("abc1234", { trackClick: false });

    const codeResult = ShortCode.create("abc1234");
    if (!codeResult.ok) throw new Error("Invalid test fixture");
    const stored = await repository.findByCode(codeResult.value);
    expect(stored?.clickCount).toBe(0);
  });

  it("returns not-found for a well-formed but unknown code", async () => {
    const { useCase } = await buildResolver();

    const result = await useCase.execute("zzzzzz9", { trackClick: true });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("short-code-not-found");
  });

  it("returns a typed error for a malformed code", async () => {
    const { useCase } = await buildResolver();

    const result = await useCase.execute("ab", { trackClick: true });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("invalid-short-code");
  });
});
