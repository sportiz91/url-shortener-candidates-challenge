import { createContainer, type AppContainer } from "@url-shortener/infrastructure";
import { publicHost } from "./config";

// Survives dev-server HMR reloads: module state is reset on every reload,
// globalThis is not — without this each hot update would leak a PrismaClient.
const globalCache = globalThis as { __appContainer?: AppContainer };

export function getContainer(): AppContainer {
  globalCache.__appContainer ??= createContainer({ publicHost });
  return globalCache.__appContainer;
}
