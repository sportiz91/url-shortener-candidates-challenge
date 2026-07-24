import type { InvalidShortCodeError, ShortCodeNotFoundError } from "../domain/errors";
import { ShortCode } from "../domain/short-code";
import { err, ok, type Result } from "../shared/result";
import type { Clock, UrlRepository } from "./ports";

export type ResolveShortCodeError = InvalidShortCodeError | ShortCodeNotFoundError;

export type ResolveShortCodeSuccess = {
  readonly targetUrl: string;
};

type Dependencies = {
  repository: UrlRepository;
  clock: Clock;
};

export class ResolveShortCode {
  constructor(private readonly deps: Dependencies) {}

  async execute(
    rawCode: string,
    options: { trackClick: boolean },
  ): Promise<Result<ResolveShortCodeSuccess, ResolveShortCodeError>> {
    const codeResult = ShortCode.create(rawCode);
    if (!codeResult.ok) {
      return codeResult;
    }

    const found = await this.deps.repository.findByCode(codeResult.value);
    if (!found) {
      return err({
        type: "short-code-not-found",
        message: "This short link does not exist",
      });
    }

    if (options.trackClick) {
      await this.registerClickSafely(codeResult.value);
    }

    return ok({ targetUrl: found.originalUrl.value });
  }

  private async registerClickSafely(code: ShortCode): Promise<void> {
    try {
      await this.deps.repository.registerClick(code, this.deps.clock.now());
    } catch {
      // A failed click count must never break the redirect itself.
    }
  }
}
