import { err, ok, type Result } from "../shared/result";
import type { InvalidShortCodeError } from "./errors";

/**
 * 7 base62 characters give 62^7 ≈ 3.5 trillion possible codes, so random
 * collisions stay negligible far beyond this service's realistic scale.
 */
export const SHORT_CODE_LENGTH = 7;

const SHORT_CODE_PATTERN = new RegExp(`^[0-9A-Za-z]{${SHORT_CODE_LENGTH}}$`);

export class ShortCode {
  private constructor(readonly value: string) {}

  static create(raw: string): Result<ShortCode, InvalidShortCodeError> {
    if (!SHORT_CODE_PATTERN.test(raw)) {
      return err({
        type: "invalid-short-code",
        message: `Short codes are exactly ${SHORT_CODE_LENGTH} alphanumeric characters`,
      });
    }
    return ok(new ShortCode(raw));
  }

  equals(other: ShortCode): boolean {
    return this.value === other.value;
  }
}
