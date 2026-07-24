import { describe, expect, it } from "vitest";
import { RandomCodeGenerator } from "../application/random-code-generator";
import { SHORT_CODE_LENGTH, ShortCode } from "./short-code";

describe("ShortCode", () => {
  it("accepts a 7-character alphanumeric code", () => {
    const result = ShortCode.create("aB3xY9k");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.value).toBe("aB3xY9k");
  });

  it.each(["abc12", "abcd12345", "abc-123", ""])("rejects malformed code: %j", (raw) => {
    const result = ShortCode.create(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe("invalid-short-code");
  });
});

describe("RandomCodeGenerator", () => {
  it("generates codes with the expected shape", () => {
    const code = new RandomCodeGenerator().generate();

    expect(code.value).toMatch(new RegExp(`^[0-9A-Za-z]{${SHORT_CODE_LENGTH}}$`));
  });

  it("does not repeat codes across many generations", () => {
    const generator = new RandomCodeGenerator();

    const codes = new Set(Array.from({ length: 200 }, () => generator.generate().value));

    expect(codes.size).toBe(200);
  });
});
