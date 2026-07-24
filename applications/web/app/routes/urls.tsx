import { Link } from "react-router";
import type { Route } from "./+types/urls";
import { publicOrigin } from "../.server/config";
import { getContainer } from "../.server/container";
import { Card } from "../components/ui/Card";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Links & stats — URL Shortener" }];
}

export async function loader() {
  const urls = await getContainer().listUrls.execute();
  return {
    urls: urls.map((url) => ({
      code: url.code.value,
      shortUrl: `${publicOrigin}/s/${url.code.value}`,
      originalUrl: url.originalUrl.value,
      clickCount: url.clickCount,
      createdAt: url.createdAt.toISOString(),
      lastClickedAt: url.lastClickedAt?.toISOString() ?? null,
    })),
  };
}

// Fixed locale + UTC so server and client render identical text (no
// hydration mismatch from machine-dependent locales/timezones).
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

export default function Urls({ loaderData }: Route.ComponentProps) {
  const { urls } = loaderData;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Links &amp; stats</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Every shortened link with its click count.
        </p>
      </div>

      {urls.length === 0 ? <EmptyState /> : <UrlsTable urls={urls} />}
    </main>
  );
}

function EmptyState() {
  return (
    <Card className="text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No links yet.{" "}
        <Link
          to="/"
          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Shorten your first URL
        </Link>
        .
      </p>
    </Card>
  );
}

type UrlRow = Awaited<ReturnType<typeof loader>>["urls"][number];

function UrlsTable({ urls }: { urls: UrlRow[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">Short link</th>
            <th className="px-4 py-3 font-medium">Destination</th>
            <th className="px-4 py-3 text-right font-medium">Clicks</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Last click</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {urls.map((url) => (
            <tr key={url.code}>
              <td className="px-4 py-3">
                <a
                  href={url.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  /s/{url.code}
                </a>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-gray-300">
                <a
                  href={url.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={url.originalUrl}
                  className="hover:underline"
                >
                  {url.originalUrl}
                </a>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {url.clickCount}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                {formatDate(url.createdAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                {url.lastClickedAt ? formatDate(url.lastClickedAt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
