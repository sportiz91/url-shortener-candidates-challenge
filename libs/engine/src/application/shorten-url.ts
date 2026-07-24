import type { CodeGenerationExhaustedError, InvalidUrlError } from "../domain/errors";
import { OriginalUrl } from "../domain/original-url";
import { ShortenedUrl } from "../domain/shortened-url";
import { err, ok, type Result } from "../shared/result";
import type { Clock, CodeGenerator, UrlRepository } from "./ports";

const MAX_CODE_GENERATION_ATTEMPTS = 3;

export type ShortenUrlSuccess = {
  readonly shortenedUrl: ShortenedUrl;
  /** True when this URL was already shortened before — its code is reused. */
  readonly alreadyExisted: boolean;
};

export type ShortenUrlError = InvalidUrlError | CodeGenerationExhaustedError;

type Dependencies = {
  repository: UrlRepository;
  codeGenerator: CodeGenerator;
  clock: Clock;
  /** Host of this service, so short links can never point at themselves. */
  publicHost: string | null;
};

/**
 * Shortening is idempotent: the same URL always maps to the same code.
 * That keeps the table free of duplicates and makes retries harmless.
 */
export class ShortenUrl {
  constructor(private readonly deps: Dependencies) {}

  async execute(rawUrl: string): Promise<Result<ShortenUrlSuccess, ShortenUrlError>> {
    const blockedHosts = this.deps.publicHost ? [this.deps.publicHost] : [];
    const urlResult = OriginalUrl.create(rawUrl, { blockedHosts });
    if (!urlResult.ok) {
      return urlResult;
    }

    const existing = await this.deps.repository.findByOriginalUrl(urlResult.value);
    if (existing) {
      return ok({ shortenedUrl: existing, alreadyExisted: true });
    }

    return this.saveWithFreshCode(urlResult.value);
  }

  private async saveWithFreshCode(
    originalUrl: OriginalUrl,
  ): Promise<Result<ShortenUrlSuccess, ShortenUrlError>> {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = this.deps.codeGenerator.generate();
      const shortenedUrl = ShortenedUrl.create(code, originalUrl, this.deps.clock.now());

      const saved = await this.deps.repository.save(shortenedUrl);
      if (saved.ok) {
        return ok({ shortenedUrl, alreadyExisted: false });
      }

      if (saved.error.conflict === "original-url-taken") {
        // Lost a race against a concurrent request for the same URL — reuse its code.
        const winner = await this.deps.repository.findByOriginalUrl(originalUrl);
        if (winner) {
          return ok({ shortenedUrl: winner, alreadyExisted: true });
        }
      }
      // "code-taken": extremely unlikely with 62^7 codes — just try a fresh one.
    }

    return err({
      type: "code-generation-exhausted",
      message: "Could not allocate a unique short code — please try again",
    });
  }
}
