export { ok, err } from "./shared/result";
export type { Result, Ok, Err } from "./shared/result";

export type {
  InvalidUrlError,
  InvalidShortCodeError,
  ShortCodeNotFoundError,
  CodeGenerationExhaustedError,
  SaveConflictError,
  DomainError,
} from "./domain/errors";
export { OriginalUrl } from "./domain/original-url";
export { ShortCode, SHORT_CODE_LENGTH } from "./domain/short-code";
export { ShortenedUrl } from "./domain/shortened-url";
export type { ShortenedUrlProps } from "./domain/shortened-url";

export type { UrlRepository, CodeGenerator, Clock } from "./application/ports";
export { RandomCodeGenerator } from "./application/random-code-generator";
export { ShortenUrl } from "./application/shorten-url";
export type { ShortenUrlSuccess, ShortenUrlError } from "./application/shorten-url";
export { ResolveShortCode } from "./application/resolve-short-code";
export type {
  ResolveShortCodeError,
  ResolveShortCodeSuccess,
} from "./application/resolve-short-code";
export { ListUrls } from "./application/list-urls";
export { InMemoryUrlRepository } from "./application/testing/in-memory-url-repository";
