import { expect, test, type Page } from "@playwright/test";

// isbot excludes headless/system user agents from click stats, so requests
// that must count as clicks send a real browser UA explicitly.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function uniqueUrl(): string {
  return `https://example.com/e2e/${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function shorten(page: Page, url: string): Promise<string> {
  await page.goto("/");
  await page.getByPlaceholder(/example\.com/).fill(url);
  await page.getByRole("button", { name: /shorten/i }).click();
  const link = page.getByRole("link", { name: /\/s\/[0-9A-Za-z]{7}/ });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  if (!href) throw new Error("Short link has no href");
  return href;
}

test("shortens a URL and shows a copyable short link", async ({ page }) => {
  const shortUrl = await shorten(page, uniqueUrl());

  expect(shortUrl).toMatch(/\/s\/[0-9A-Za-z]{7}$/);
  await expect(page.getByRole("button", { name: /copy/i })).toBeVisible();
});

test("redirects the short code to the original URL with a 302", async ({
  page,
  request,
}) => {
  const target = uniqueUrl();
  const shortUrl = await shorten(page, target);

  const response = await request.get(shortUrl, {
    maxRedirects: 0,
    headers: { "user-agent": BROWSER_UA },
  });

  expect(response.status()).toBe(302);
  expect(response.headers()["location"]).toBe(target);
});

test("rejects an unsafe URL with inline feedback", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/example\.com/).fill("javascript:alert(1)");
  await page.getByRole("button", { name: /shorten/i }).click();

  await expect(page.getByRole("alert")).toContainText(/only http and https/i);
});

test("shows the link with its click count on /urls", async ({ page, request }) => {
  const target = uniqueUrl();
  const shortUrl = await shorten(page, target);
  await request.get(shortUrl, {
    maxRedirects: 0,
    headers: { "user-agent": BROWSER_UA },
  });

  await page.goto("/urls");

  const code = shortUrl.split("/").at(-1);
  const row = page.getByRole("row").filter({ hasText: `/s/${code}` });
  await expect(row).toBeVisible();
  await expect(row).toContainText("1");
});
