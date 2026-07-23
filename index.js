/**
 * localplugseo — the LocalPlug SEO site SDK.
 *
 * Solution by CodeCraft Studios (https://www.codecraftstudios.net)
 *
 * The SDK a LocalPlug SEO client website is built on. It talks to the SITE
 * surface (/api/site/*) with a per-site key issued from the LocalPlug SEO
 * dashboard, and it is PAIRED to the LocalPlug SEO platform: a key that belongs
 * to any other platform is rejected on first use.
 *
 *   import { SiteClient } from "localplugseo";
 *
 *   const lps = new SiteClient({ key: process.env.NEXT_PUBLIC_LPS_SITE_KEY });
 *   const { content } = await lps.content.list({ section: "home" });
 */

import { LeadsModule } from "./services/leads.js";
import { ContentModule } from "./services/content.js";
import { FilesModule } from "./services/files.js";
import { FormsModule } from "./services/forms.js";
import { ProductsModule } from "./services/products.js";
import { LocationsModule } from "./services/locations.js";

/** The one platform this SDK will ever speak for. */
export const PLATFORM_SLUG = "dispensary-local-seo";
export const PLATFORM_NAME = "LocalPlug SEO";

const KEY_PATTERN = /^dfd-site-(public|secret)-key-(live|test)-[A-Za-z0-9_-]{20,}$/;

export class SiteClient {
  /**
   * @param {Object} options
   * @param {string} options.key      dfd-site-*-key-* (secret = server-side only)
   * @param {string} [options.baseURL] Override the API host (local dev)
   */
  constructor({ key, baseURL = "https://api.dashfordevs.com" } = {}) {
    if (!key) {
      throw new Error(
        "A site key is required. Get one from your LocalPlug SEO dashboard → Websites → your site → API keys."
      );
    }

    const match = KEY_PATTERN.exec(key);
    if (!match) {
      throw new Error(
        "Invalid site key.\n\n" +
          "Expected: dfd-site-<public|secret>-key-<live|test>-<random>\n" +
          "Note this is NOT a dfd-platform-* key — those belong to the dashboard, never to a website."
      );
    }

    const [, kind, environment] = match;

    // A secret key in a browser bundle bypasses the origin allowlist and can
    // write. Fail loudly at construction rather than leak quietly at runtime.
    if (kind === "secret" && typeof window !== "undefined") {
      throw new Error(
        "\n\n🚨 LOCALPLUG SEO SECURITY ERROR 🚨\n\n" +
          "A SECRET site key is being used in the browser.\n" +
          "Use it only in server code (route handlers, server components, API routes).\n" +
          "For the browser, issue a PUBLIC key and give it an allowed origin.\n\n" +
          "If this key has been exposed, revoke it now:\n" +
          "LocalPlug SEO dashboard → Websites → your site → API keys\n"
      );
    }

    // A secret key handed to NEXT_PUBLIC_* is the same leak, one build step later.
    if (typeof process !== "undefined" && process.env) {
      for (const [name, value] of Object.entries(process.env)) {
        if (
          name.startsWith("NEXT_PUBLIC_") &&
          typeof value === "string" &&
          value.startsWith("dfd-site-secret-key-")
        ) {
          throw new Error(
            "\n\n🚨 LOCALPLUG SEO SECURITY ERROR 🚨\n\n" +
              `A secret site key is in ${name}.\n` +
              "NEXT_PUBLIC_ variables are inlined into the browser bundle.\n" +
              "Move it to a non-public variable and use it server-side only.\n"
          );
        }
      }
    }

    this.key = key;
    this.kind = kind;
    this.environment = environment;
    this.baseURL = baseURL.replace(/\/$/, "");
    this._pairing = null; // memoized whoami/pairing check

    this.leads = new LeadsModule(this);
    this.content = new ContentModule(this);
    this.files = new FilesModule(this);
    this.forms = new FormsModule(this);
    this.products = new ProductsModule(this);
    this.locations = new LocationsModule(this);
  }

  get isServerSide() {
    return typeof window === "undefined";
  }

  /**
   * The pairing check: this SDK only serves LocalPlug SEO. The first call (any
   * call) verifies the key's platform against PLATFORM_SLUG — a valid site key
   * from some OTHER whitelabel platform is structurally identical, so the slug
   * from whoami is the thing that actually enforces the pairing. Memoized; one
   * extra round-trip on cold start, then free.
   */
  async _assertPaired() {
    if (!this._pairing) {
      this._pairing = this._rawFetch("/api/site/whoami").then((who) => {
        const slug = who?.platform?.slug;
        if (slug && slug !== PLATFORM_SLUG) {
          this._pairing = null;
          throw new Error(
            `This key belongs to the '${slug}' platform. The localplugseo SDK is ` +
              `paired to ${PLATFORM_NAME} ('${PLATFORM_SLUG}') and will not serve ` +
              "another platform's sites."
          );
        }
        return who;
      });
      this._pairing.catch(() => {
        // A transient failure must not poison every future call.
        this._pairing = null;
      });
    }
    return this._pairing;
  }

  async _rawFetch(path, options = {}) {
    const headers = {
      "X-Site-Key": this.key,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Non-JSON body (a proxy error page, usually) — fall through to the throw.
    }

    if (!response.ok) {
      const error = new Error(payload?.message || `Site API error (${response.status})`);
      error.status = response.status;
      error.code = payload?.error;
      error.payload = payload;

      // The errors people actually hit should say what to do.
      if (payload?.error === "origin_not_allowed") {
        error.message +=
          "\n→ Add this domain to the key's allowed origins in the LocalPlug SEO dashboard.";
      } else if (payload?.error === "secret_key_required") {
        error.message +=
          "\n→ Public keys are read-only. Do this call from your server with a secret site key.";
      } else if (payload?.error === "key_revoked") {
        error.message += "\n→ This site's key was revoked. Issue a new one from the dashboard.";
      } else if (payload?.error === "module_not_enabled") {
        error.message += "\n→ This capability isn't enabled for the platform yet.";
      }
      throw error;
    }

    return payload;
  }

  async _fetch(path, options = {}) {
    await this._assertPaired();
    return this._rawFetch(path, options);
  }

  /** The site this key belongs to: site, customer, platform, environment, modules. */
  async whoami() {
    return this._assertPaired();
  }
}

export default SiteClient;
