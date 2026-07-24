import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <Header />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <nav className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-base font-bold tracking-tight">
          url<span className="text-indigo-500">shortener</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <NavLink to="/" className={navLinkClassName} end>
            Shorten
          </NavLink>
          <NavLink to="/urls" className={navLinkClassName}>
            Links &amp; stats
          </NavLink>
        </div>
      </nav>
    </header>
  );
}

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return isActive
    ? "font-semibold text-indigo-600 dark:text-indigo-400"
    : "text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100";
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "An unexpected error occurred. Please try again.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    details =
      error.status === 404
        ? "The page you're looking for doesn't exist."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{message}</h1>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{details}</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        Back home
      </Link>
      {stack ? (
        <pre className="mt-8 w-full overflow-x-auto rounded-lg bg-gray-100 p-4 text-left text-xs dark:bg-gray-900">
          <code>{stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
