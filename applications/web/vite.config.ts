import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Dev only: expose the repo-root .env (DATABASE_URL, PUBLIC_URL) to the
  // SSR runtime. In production the environment comes from the container.
  Object.assign(process.env, loadEnv(mode, "../..", ""));

  return {
    envDir: "../..",
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    ssr: {
      // Workspace packages ship TypeScript sources — bundle them into the
      // server build.
      noExternal: ["@url-shortener/engine", "@url-shortener/infrastructure"],
      // Never bundle the Prisma client: its generated code resolves
      // ".prisma/client" at require-time, which breaks inside an ESM bundle.
      external: ["@prisma/client"],
    },
    optimizeDeps: {
      include: ["@url-shortener/engine"],
    },
  };
});
