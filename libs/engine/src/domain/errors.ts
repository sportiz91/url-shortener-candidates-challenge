export type InvalidUrlError = {
  readonly type: "invalid-url";
  readonly message: string;
};

export type InvalidShortCodeError = {
  readonly type: "invalid-short-code";
  readonly message: string;
};

export type ShortCodeNotFoundError = {
  readonly type: "short-code-not-found";
  readonly message: string;
};

export type CodeGenerationExhaustedError = {
  readonly type: "code-generation-exhausted";
  readonly message: string;
};

/**
 * Raised by the repository when a unique constraint rejects a save.
 * Which constraint fired decides the recovery strategy: a taken code is
 * retried with a fresh one, a taken original URL means a concurrent
 * request already shortened it and its code should be reused.
 */
export type SaveConflictError = {
  readonly type: "save-conflict";
  readonly conflict: "code-taken" | "original-url-taken";
};

export type DomainError =
  | InvalidUrlError
  | InvalidShortCodeError
  | ShortCodeNotFoundError
  | CodeGenerationExhaustedError
  | SaveConflictError;
