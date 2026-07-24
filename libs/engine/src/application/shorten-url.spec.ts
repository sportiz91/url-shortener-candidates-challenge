import { describe, expect, it } from "vitest";
import type { SaveConflictError } from "../domain/errors";
import { OriginalUrl } from "../domain/original-url";
import { ShortCode } from "../domain/short-code";
import { ShortenedUrl } from "../domain/shortened-url";
import { err, type Result } from "../shared/result";
import type { Clock, CodeGenerator, UrlRepository } from "./ports";
import { RandomCodeGenerator } from "./random-code-generator";
import { ShortenUrl } from "./shorten-url";
import { InMemoryUrlRepository } from "./testing/in-memory-url-repository";

const fixedClock: Clock = { now: () => new Date("2026-07-24T10:00:00.000Z") };

class SequenceCodeGenerator implements CodeGenerator {
  private index = 0;

  constructor(private readonly codes: readonly string[]) {}

  generate(): ShortCode {
    const raw = this.codes[Math.min(this.index, this.codes.length - 1)];
    this.index += 1;
    const result = ShortCode.create(raw);
    if (!result.ok) throw new Error(`Invalid test code: ${raw}`);
    return result.value;
  }
}

function buildUseCase(
  overrides: { repository?: UrlRepository; codeGenerator?: CodeGenerator } = {},
) {
  const repository = overrides.repository ?? new InMemoryUrlRepository();
  const useCase = new ShortenUrl({
    repository,
    codeGenerator: overrides.codeGenerator ?? new RandomCodeGenerator(),
    clock: fixedClock,
    publicHost: "sho.rt",
  });
  return { useCase, repository };
}

function seededUrl(rawUrl: string, rawCode: string): ShortenedUrl {
  const url = OriginalUrl.create(rawUrl);
  const code = ShortCode.create(rawCode);
  if (!url.ok || !code.ok) throw new Error("Invalid test fixture");
  return ShortenedUrl.create(code.value, url.value, fixedClock.now());
}

describe("ShortenUrl", () => {
  it("shortens a valid URL and persists it", async () => {
    const { useCase, repository } = buildUseCase();

    const result = await useCase.execute("https://example.com/very/long/path");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alreadyExisted).toBe(false);
    const stored = await repository.findByCode(result.value.shortenedUrl.code);
    expect(stored?.originalUrl.value).toBe("https://example.com/very/long/path");
  });

  it("returns a typed error for an invalid URL", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute("javascript:alert(1)");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("invalid-url");
  });

  it("is idempotent: the same URL always maps to the same code", async () => {
    const { useCase } = buildUseCase();

    const first = await useCase.execute("https://example.com/article");
    const second = await useCase.execute("https://example.com/article");

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.shortenedUrl.code.value).toBe(
      first.value.shortenedUrl.code.value,
    );
    expect(second.value.alreadyExisted).toBe(true);
  });

  it("retries with a fresh code when the generated one collides", async () => {
    const repository = new InMemoryUrlRepository();
    await repository.save(seededUrl("https://taken.example.com", "AAAAAAA"));
    const { useCase } = buildUseCase({
      repository,
      codeGenerator: new SequenceCodeGenerator(["AAAAAAA", "BBBBBBB"]),
    });

    const result = await useCase.execute("https://fresh.example.com");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.shortenedUrl.code.value).toBe("BBBBBBB");
  });

  it("fails with a typed error after exhausting collision retries", async () => {
    const repository = new InMemoryUrlRepository();
    await repository.save(seededUrl("https://taken.example.com", "AAAAAAA"));
    const { useCase } = buildUseCase({
      repository,
      codeGenerator: new SequenceCodeGenerator(["AAAAAAA"]),
    });

    const result = await useCase.execute("https://fresh.example.com");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("code-generation-exhausted");
  });

  it("reuses the winner's code when losing a concurrent race for the same URL", async () => {
    const winner = seededUrl("https://example.com/raced", "WINNER7");
    let lookups = 0;
    const racingRepository: UrlRepository = {
      async findByOriginalUrl(): Promise<ShortenedUrl | null> {
        lookups += 1;
        // First lookup: nothing there yet. Second lookup (after the failed
        // save): the concurrent request has already persisted the URL.
        return lookups === 1 ? null : winner;
      },
      async save(): Promise<Result<void, SaveConflictError>> {
        return err({ type: "save-conflict", conflict: "original-url-taken" });
      },
      async findByCode() {
        return null;
      },
      async listMostRecent() {
        return [];
      },
      async registerClick() {},
    };
    const { useCase } = buildUseCase({ repository: racingRepository });

    const result = await useCase.execute("https://example.com/raced");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.shortenedUrl.code.value).toBe("WINNER7");
    expect(result.value.alreadyExisted).toBe(true);
  });

  it("refuses to shorten a URL pointing at this service itself", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute("https://sho.rt/s/abc1234");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("invalid-url");
  });
});
