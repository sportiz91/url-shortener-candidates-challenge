import { PrismaClient } from "@prisma/client";
import {
  ListUrls,
  RandomCodeGenerator,
  ResolveShortCode,
  ShortenUrl,
  type Clock,
} from "@url-shortener/engine";
import { PrismaUrlRepository } from "./prisma-url-repository";

export type AppContainer = {
  readonly shortenUrl: ShortenUrl;
  readonly resolveShortCode: ResolveShortCode;
  readonly listUrls: ListUrls;
};

export type ContainerConfig = {
  /** Host (host[:port]) where this service is exposed, e.g. "localhost:3000". */
  publicHost: string | null;
};

const systemClock: Clock = { now: () => new Date() };

/**
 * Single composition root: the only place where concrete adapters are wired
 * to the domain's ports. Routes receive use cases and never see Prisma.
 */
export function createContainer(config: ContainerConfig): AppContainer {
  const prisma = new PrismaClient();
  const repository = new PrismaUrlRepository(prisma);

  return {
    shortenUrl: new ShortenUrl({
      repository,
      codeGenerator: new RandomCodeGenerator(),
      clock: systemClock,
      publicHost: config.publicHost,
    }),
    resolveShortCode: new ResolveShortCode({ repository, clock: systemClock }),
    listUrls: new ListUrls({ repository }),
  };
}
