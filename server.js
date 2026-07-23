/**
 * Server-only entry point.
 *
 *   import { createSiteClient } from "localplug-sdk/server";
 *   const lps = createSiteClient();   // reads LPS_SITE_KEY
 *
 * Importing this from a client component throws at module load, so a secret key
 * can't be dragged into a browser bundle by an accidental import.
 */

import { SiteClient } from "./index.js";

if (typeof window !== "undefined") {
  throw new Error(
    "\n\n🚨 localplug-sdk/server was imported in the browser.\n\n" +
      "This module carries your SECRET site key. Import it only from server code —\n" +
      "route handlers, server components, or getServerSideProps.\n" +
      "For the browser, construct SiteClient with a PUBLIC key instead.\n"
  );
}

/**
 * @param {Object} [options]
 * @param {string} [options.key]     Defaults to process.env.LPS_SITE_KEY
 * @param {string} [options.baseURL] Defaults to process.env.LPS_API_URL
 */
export function createSiteClient({ key, baseURL } = {}) {
  const resolvedKey = key || process.env.LPS_SITE_KEY;
  if (!resolvedKey) {
    throw new Error(
      "No site key. Set LPS_SITE_KEY (NOT NEXT_PUBLIC_*) or pass { key }."
    );
  }
  return new SiteClient({
    key: resolvedKey,
    baseURL: baseURL || process.env.LPS_API_URL || "https://api.dashfordevs.com",
  });
}

export { SiteClient, PLATFORM_SLUG, PLATFORM_NAME } from "./index.js";
