import { createContainer, type AppContainer } from "@url-shortener/infrastructure";
import { publicHost } from "./config";

// Dev only: module state resets on every HMR reload, globalThis does not —
// without this each hot update would leak a PrismaClient connection pool.
// In production the module itself is the singleton (one clean process).
const globalCache = globalThis as { __appContainer?: AppContainer };

export function getContainer(): AppContainer {
  if (process.env.NODE_ENV === "production") {
    return (containerSingleton ??= createContainer({ publicHost }));
  }
  globalCache.__appContainer ??= createContainer({ publicHost });
  return globalCache.__appContainer;
}

let containerSingleton: AppContainer | undefined;
