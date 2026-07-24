import type { ShortenedUrl } from "../domain/shortened-url";
import type { UrlRepository } from "./ports";

const DEFAULT_LIMIT = 50;

export class ListUrls {
  constructor(private readonly deps: { repository: UrlRepository }) {}

  execute(limit: number = DEFAULT_LIMIT): Promise<ShortenedUrl[]> {
    return this.deps.repository.listMostRecent(limit);
  }
}
