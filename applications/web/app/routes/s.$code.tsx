import { isbot } from "isbot";
import { data, isRouteErrorResponse, Link, redirect } from "react-router";
import type { Route } from "./+types/s.$code";
import { getContainer } from "../.server/container";
import { Card } from "../components/ui/Card";

export async function loader({ request, params }: Route.LoaderArgs) {
  // Crawlers and link-preview bots would inflate click stats — don't count them.
  const trackClick = !isbot(request.headers.get("user-agent"));

  const result = await getContainer().resolveShortCode.execute(params.code, {
    trackClick,
  });

  if (!result.ok) {
    // Malformed and unknown codes both surface as 404 — no need to reveal which.
    throw data("Short link not found", { status: 404 });
  }

  // 302, not 301: browsers cache permanent redirects, so repeat clicks would
  // never reach the server again and click stats would silently stop counting.
  return redirect(result.value.targetUrl, 302);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-24">
      <Card className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isNotFound ? "This short link doesn't exist" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {isNotFound
            ? "It may have been mistyped or never created."
            : "Please try again in a moment."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Shorten a new link
        </Link>
      </Card>
    </main>
  );
}

// The loader always redirects or throws, so this never renders.
export default function ShortCodeRedirect() {
  return null;
}
