import { Prisma, type PrismaClient } from "@prisma/client";
import {
  err,
  ok,
  OriginalUrl,
  ShortCode,
  ShortenedUrl,
  type Result,
  type SaveConflictError,
  type UrlRepository,
} from "@url-shortener/engine";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

/**
 * PostgreSQL adapter for the UrlRepository port.
 *
 * Uniqueness is delegated to the database constraints on `code` and
 * `original_url`; a violated constraint is translated into the domain's
 * SaveConflictError so the use case can decide how to recover.
 */
export class PrismaUrlRepository implements UrlRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(shortenedUrl: ShortenedUrl): Promise<Result<void, SaveConflictError>> {
    try {
      await this.prisma.shortenedUrl.create({
        data: {
          code: shortenedUrl.code.value,
          originalUrl: shortenedUrl.originalUrl.value,
          clickCount: shortenedUrl.clickCount,
          createdAt: shortenedUrl.createdAt,
          lastClickedAt: shortenedUrl.lastClickedAt,
        },
      });
      return ok(undefined);
    } catch (error) {
      const conflict = extractUniqueConflict(error);
      if (conflict) {
        return err({ type: "save-conflict", conflict });
      }
      throw error;
    }
  }

  async findByCode(code: ShortCode): Promise<ShortenedUrl | null> {
    const row = await this.prisma.shortenedUrl.findUnique({
      where: { code: code.value },
    });
    return row ? toDomain(row) : null;
  }

  async findByOriginalUrl(originalUrl: OriginalUrl): Promise<ShortenedUrl | null> {
    const row = await this.prisma.shortenedUrl.findUnique({
      where: { originalUrl: originalUrl.value },
    });
    return row ? toDomain(row) : null;
  }

  async listMostRecent(limit: number): Promise<ShortenedUrl[]> {
    const rows = await this.prisma.shortenedUrl.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toDomain);
  }

  async registerClick(code: ShortCode, occurredAt: Date): Promise<void> {
    // Single atomic UPDATE — concurrent redirects never lose a click.
    await this.prisma.shortenedUrl.updateMany({
      where: { code: code.value },
      data: {
        clickCount: { increment: 1 },
        lastClickedAt: occurredAt,
      },
    });
  }
}

type ShortenedUrlRow = {
  code: string;
  originalUrl: string;
  clickCount: number;
  createdAt: Date;
  lastClickedAt: Date | null;
};

function toDomain(row: ShortenedUrlRow): ShortenedUrl {
  const code = ShortCode.create(row.code);
  const originalUrl = OriginalUrl.create(row.originalUrl);
  if (!code.ok || !originalUrl.ok) {
    throw new Error(`Persisted row for code "${row.code}" fails domain validation`);
  }
  return ShortenedUrl.rehydrate({
    code: code.value,
    originalUrl: originalUrl.value,
    clickCount: row.clickCount,
    createdAt: row.createdAt,
    lastClickedAt: row.lastClickedAt,
  });
}

function extractUniqueConflict(error: unknown): SaveConflictError["conflict"] | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code !== UNIQUE_CONSTRAINT_VIOLATION) return null;

  const target = error.meta?.target;
  const columns = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
  const isOriginalUrl = columns.some(
    (column) => column.includes("original_url") || column.includes("originalUrl"),
  );
  return isOriginalUrl ? "original-url-taken" : "code-taken";
}
