const rawPublicUrl = process.env.PUBLIC_URL ?? "http://localhost:5173";

function parsePublicUrl(candidate: string): URL {
  try {
    return new URL(candidate);
  } catch {
    throw new Error(`PUBLIC_URL must be an absolute URL, got: "${candidate}"`);
  }
}

const publicUrl = parsePublicUrl(rawPublicUrl);

/** Origin used to build displayed short links, e.g. "http://localhost:3000". */
export const publicOrigin = publicUrl.origin;

/** host[:port] of this service — blocked from shortening to avoid redirect loops. */
export const publicHost = publicUrl.host;
