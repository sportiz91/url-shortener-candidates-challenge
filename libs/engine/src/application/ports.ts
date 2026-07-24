import type { SaveConflictError } from "../domain/errors";
import type { OriginalUrl } from "../domain/original-url";
import type { ShortCode } from "../domain/short-code";
import type { ShortenedUrl } from "../domain/shortened-url";
import type { Result } from "../shared/result";

/**
 * Persistence boundary for the ShortenedUrl aggregate.
 *
 * Uniqueness of both the code and the original URL is enforced by the
 * adapter (database unique constraints), never by check-then-insert —
 * that would race under concurrent requests.
 */
export type UrlRepository = {
  save(shortenedUrl: ShortenedUrl): Promise<Result<void, SaveConflictError>>;
  findByCode(code: ShortCode): Promise<ShortenedUrl | null>;
  findByOriginalUrl(originalUrl: OriginalUrl): Promise<ShortenedUrl | null>;
  listMostRecent(limit: number): Promise<ShortenedUrl[]>;
  /** Must be atomic (e.g. SQL increment) — read-modify-write loses clicks. */
  registerClick(code: ShortCode, occurredAt: Date): Promise<void>;
};

export type CodeGenerator = {
  generate(): ShortCode;
};

/** Injectable time source so use cases stay deterministic in tests. */
export type Clock = {
  now(): Date;
};
