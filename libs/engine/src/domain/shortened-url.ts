import type { OriginalUrl } from "./original-url";
import type { ShortCode } from "./short-code";

export type ShortenedUrlProps = {
  readonly code: ShortCode;
  readonly originalUrl: OriginalUrl;
  readonly clickCount: number;
  readonly createdAt: Date;
  readonly lastClickedAt: Date | null;
};

/**
 * Aggregate root: a short code bound to its target URL plus click stats.
 *
 * Click counting is deliberately NOT modeled as load → mutate → save on this
 * aggregate: concurrent redirects would race and drop clicks. The repository
 * exposes an atomic `registerClick` instead; the aggregate protects the
 * creation invariants (valid code, valid URL, zero initial clicks).
 */
export class ShortenedUrl {
  private constructor(private readonly props: ShortenedUrlProps) {}

  static create(
    code: ShortCode,
    originalUrl: OriginalUrl,
    createdAt: Date,
  ): ShortenedUrl {
    return new ShortenedUrl({
      code,
      originalUrl,
      clickCount: 0,
      createdAt,
      lastClickedAt: null,
    });
  }

  /** Rebuilds the aggregate from already-validated persisted state. */
  static rehydrate(props: ShortenedUrlProps): ShortenedUrl {
    return new ShortenedUrl(props);
  }

  get code(): ShortCode {
    return this.props.code;
  }

  get originalUrl(): OriginalUrl {
    return this.props.originalUrl;
  }

  get clickCount(): number {
    return this.props.clickCount;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get lastClickedAt(): Date | null {
    return this.props.lastClickedAt;
  }
}
