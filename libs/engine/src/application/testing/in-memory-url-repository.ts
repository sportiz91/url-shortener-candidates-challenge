import type { SaveConflictError } from "../../domain/errors";
import type { OriginalUrl } from "../../domain/original-url";
import type { ShortCode } from "../../domain/short-code";
import { ShortenedUrl } from "../../domain/shortened-url";
import { err, ok, type Result } from "../../shared/result";
import type { UrlRepository } from "../ports";

/**
 * In-memory implementation of the repository port. It exists to prove the
 * dependency inversion works: every use case is tested against this fake,
 * without a database. It mimics the adapter's contract, including both
 * unique constraints.
 */
export class InMemoryUrlRepository implements UrlRepository {
  private readonly byCode = new Map<string, ShortenedUrl>();

  async save(shortenedUrl: ShortenedUrl): Promise<Result<void, SaveConflictError>> {
    if (this.byCode.has(shortenedUrl.code.value)) {
      return err({ type: "save-conflict", conflict: "code-taken" });
    }
    const urlTaken = [...this.byCode.values()].some((existing) =>
      existing.originalUrl.equals(shortenedUrl.originalUrl),
    );
    if (urlTaken) {
      return err({ type: "save-conflict", conflict: "original-url-taken" });
    }

    this.byCode.set(shortenedUrl.code.value, shortenedUrl);
    return ok(undefined);
  }

  async findByCode(code: ShortCode): Promise<ShortenedUrl | null> {
    return this.byCode.get(code.value) ?? null;
  }

  async findByOriginalUrl(originalUrl: OriginalUrl): Promise<ShortenedUrl | null> {
    return (
      [...this.byCode.values()].find((existing) =>
        existing.originalUrl.equals(originalUrl),
      ) ?? null
    );
  }

  async listMostRecent(limit: number): Promise<ShortenedUrl[]> {
    return [...this.byCode.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async registerClick(code: ShortCode, occurredAt: Date): Promise<void> {
    const existing = this.byCode.get(code.value);
    if (!existing) {
      return;
    }
    this.byCode.set(
      code.value,
      ShortenedUrl.rehydrate({
        code: existing.code,
        originalUrl: existing.originalUrl,
        clickCount: existing.clickCount + 1,
        createdAt: existing.createdAt,
        lastClickedAt: occurredAt,
      }),
    );
  }
}
