import { data, Form, useNavigation } from "react-router";
import type { Route } from "./+types/_index";
import { publicOrigin } from "../.server/config";
import { getContainer } from "../.server/container";
import { getClientKey, getRateLimiter } from "../.server/rate-limiter";
import { CopyButton } from "../components/CopyButton";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

type ActionData =
  | { status: "success"; shortUrl: string; alreadyExisted: boolean }
  | { status: "error"; message: string };

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "URL Shortener" },
    { name: "description", content: "Shorten your URLs quickly and easily" },
  ];
}

export function loader() {
  return { shortUrlPrefix: `${publicOrigin}/s/` };
}

export async function action({ request }: Route.ActionArgs) {
  const rateLimit = getRateLimiter().check(getClientKey(request));
  if (!rateLimit.allowed) {
    return data(
      {
        status: "error",
        message: `Too many requests — try again in ${rateLimit.retryAfterSeconds}s`,
      } satisfies ActionData,
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const formData = await request.formData();
  const rawUrl = formData.get("url");
  if (typeof rawUrl !== "string") {
    return data({ status: "error", message: "URL is required" } satisfies ActionData, {
      status: 400,
    });
  }

  const result = await getContainer().shortenUrl.execute(rawUrl);
  if (!result.ok) {
    return data({ status: "error", message: result.error.message } satisfies ActionData, {
      status: 400,
    });
  }

  return data({
    status: "success",
    shortUrl: `${publicOrigin}/s/${result.value.shortenedUrl.code.value}`,
    alreadyExisted: result.value.alreadyExisted,
  } satisfies ActionData);
}

export default function Index({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const error = actionData?.status === "error" ? actionData.message : undefined;
  const result = actionData?.status === "success" ? actionData : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Shorten a URL</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Paste a long link and get back{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
            {loaderData.shortUrlPrefix}code
          </code>
        </p>
      </div>

      <Card>
        <Form method="post" className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Input
            name="url"
            type="text"
            inputMode="url"
            placeholder="https://example.com/a/very/long/path"
            autoComplete="off"
            required
            error={error}
          />
          <Button type="submit" isLoading={isSubmitting} className="sm:w-40">
            {isSubmitting ? "Shortening…" : "Shorten"}
          </Button>
        </Form>

        {result ? <ShortenResult {...result} /> : null}
      </Card>
    </main>
  );
}

function ShortenResult({
  shortUrl,
  alreadyExisted,
}: {
  shortUrl: string;
  alreadyExisted: boolean;
}) {
  return (
    <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
        Your short link
      </p>
      <div className="flex items-center justify-between gap-3">
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-mono text-sm text-indigo-700 hover:underline dark:text-indigo-300"
        >
          {shortUrl}
        </a>
        <CopyButton value={shortUrl} />
      </div>
      {alreadyExisted ? (
        <p className="mt-2 text-xs text-indigo-600/80 dark:text-indigo-400/80">
          This URL was shortened before — same link, same stats.
        </p>
      ) : null}
    </div>
  );
}
