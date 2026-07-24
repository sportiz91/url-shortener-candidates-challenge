import { err, ok, type Result } from "../shared/result";
import type { InvalidUrlError } from "./errors";

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Value object wrapping a validated, normalized target URL.
 *
 * Validation lives here — inside the domain — so it cannot be bypassed by
 * any entry point. This is what stops open-redirect payloads such as
 * `javascript:alert(1)` or `data:` URIs from ever being persisted.
 */
export class OriginalUrl {
  private constructor(readonly value: string) {}

  static create(
    raw: string,
    options: { blockedHosts?: readonly string[] } = {},
  ): Result<OriginalUrl, InvalidUrlError> {
    const trimmed = raw.trim();
    if (!trimmed) {
      return err(invalid("URL is required"));
    }
    if (trimmed.length > MAX_URL_LENGTH) {
      return err(invalid(`URL must be at most ${MAX_URL_LENGTH} characters`));
    }

    const parsed = parseUrl(trimmed);
    if (!parsed) {
      return err(
        invalid(
          "That doesn't look like a valid URL — include the protocol, e.g. https://example.com",
        ),
      );
    }
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return err(invalid("Only http and https URLs can be shortened"));
    }
    if (parsed.username || parsed.password) {
      return err(invalid("URLs with embedded credentials are not allowed"));
    }
    if ((options.blockedHosts ?? []).includes(parsed.host)) {
      return err(invalid("This URL cannot be shortened"));
    }

    return ok(new OriginalUrl(parsed.href));
  }

  equals(other: OriginalUrl): boolean {
    return this.value === other.value;
  }
}

function parseUrl(candidate: string): URL | null {
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function invalid(message: string): InvalidUrlError {
  return { type: "invalid-url", message };
}
