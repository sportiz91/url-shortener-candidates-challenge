import { SHORT_CODE_LENGTH, ShortCode } from "../domain/short-code";
import type { CodeGenerator } from "./ports";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// Largest multiple of 62 that fits in a byte. Bytes above it are discarded
// (rejection sampling) so `byte % 62` stays uniformly distributed.
const UNBIASED_LIMIT = 248;

/**
 * Cryptographically random base62 codes. Randomness (vs. encoding a
 * sequential id) keeps codes unguessable; uniqueness is guaranteed by the
 * database constraint plus the use case's bounded retry.
 */
export class RandomCodeGenerator implements CodeGenerator {
  generate(): ShortCode {
    let code = "";
    while (code.length < SHORT_CODE_LENGTH) {
      for (const byte of crypto.getRandomValues(new Uint8Array(SHORT_CODE_LENGTH * 2))) {
        if (code.length === SHORT_CODE_LENGTH) break;
        if (byte >= UNBIASED_LIMIT) continue;
        code += ALPHABET[byte % ALPHABET.length];
      }
    }

    const result = ShortCode.create(code);
    if (!result.ok) {
      throw new Error("RandomCodeGenerator produced an invalid code — this is a bug");
    }
    return result.value;
  }
}
