/**
 * localplug-sdk — the LocalPlug SEO site SDK.
 *
 * Solution by CodeCraft Studios (https://www.codecraftstudios.net)
 *
 * The SDK a LocalPlug SEO client website is built on. It talks to the SITE
 * surface (/api/site/*) with a per-site key issued from the LocalPlug SEO
 * dashboard, and it is PAIRED to the LocalPlug SEO platform: a key that belongs
 * to any other platform is rejected on first use.
 *
 *   import { SiteClient } from "localplug-sdk";
 *
 *   const lps = new SiteClient({ key: process.env.NEXT_PUBLIC_LPS_SITE_KEY });
 *   const { content } = await lps.content.list({ section: "home" });
 */

import { LeadsModule } from "./services/leads.js";
import { CategoriesModule } from "./services/categories.js";
import { ContentModule } from "./services/content.js";
import { FilesModule } from "./services/files.js";
import { FormsModule } from "./services/forms.js";
import { InsightsModule } from "./services/insights.js";
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
    this.categories = new CategoriesModule(this);
    this.content = new ContentModule(this);
    this.files = new FilesModule(this);
    this.forms = new FormsModule(this);
    this.insights = new InsightsModule(this);
    this.products = new ProductsModule(this);
    this.locations = new LocationsModule(this);

    // The "Powered by LocalPlug SEO" strip under the site's footer — browser
    // only (a secret key already threw above, so this is always a public key).
    if (typeof window !== "undefined") {
      this._injectFooterBranding();
    }
  }

  get isServerSide() {
    return typeof window === "undefined";
  }

  /**
   * Inject the "Powered by LocalPlug SEO" strip directly beneath the site's
   * footer. Same mechanics as the dash4devs badge: anchored as the footer's
   * next sibling (so it lands under the footer on every layout, not just when
   * <footer> is the last child of <body>), scheduled past hydration, and
   * skipped when the site already renders its own credit.
   *
   * @private
   */
  _injectFooterBranding() {
    const inject = () => {
      if (document.getElementById("localplugseo-branding")) {
        return;
      }

      // Anchor to the LAST footer on the page: a site may mark up more than
      // one <footer> (e.g. a card footer), and the page's own is the final one.
      const footers = document.querySelectorAll("footer");
      const footer = footers[footers.length - 1];
      if (!footer) {
        // Footer may not have hydrated yet — retry shortly.
        setTimeout(inject, 500);
        return;
      }

      // Don't double up on an SSR-rendered credit.
      if (
        footer.innerHTML.includes("localplugseo.com") ||
        footer.innerHTML.includes("Powered by LocalPlug SEO")
      ) {
        return;
      }

      const brandingDiv = document.createElement("div");
      brandingDiv.id = "localplugseo-branding";
      // Normal-flow strip after the footer — never floats over the page or
      // pins to the viewport.
      brandingDiv.style.cssText = `
        position: static;
        display: block;
        width: 100%;
        box-sizing: border-box;
        text-align: center;
        padding: 12px 16px;
        margin: 0;
        font-size: 14px;
        line-height: 1.4;
        color: #6b7280;
        background: #ffffff;
        border-top: 1px solid #e5e7eb;
      `;

      const href = this._brandingHref();
      brandingDiv.innerHTML = `
        Powered by <a href="${href}" target="_blank" rel="noopener noreferrer" style="font-weight: 600; color: #0369a1; text-decoration: none;">LocalPlug SEO</a>
      `;

      footer.insertAdjacentElement("afterend", brandingDiv);
    };

    // Well past SSR hydration, to prevent hydration mismatches.
    const schedule =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : (fn) => setTimeout(fn, 2000);

    schedule(() => {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inject);
      } else {
        inject();
      }
    });
  }

  /**
   * The badge's link, UTM-tagged with the client site's own domain so
   * referrals from each site are attributable in analytics.
   *
   * @private
   */
  _brandingHref() {
    const url = new URL("https://localplugseo.com/");
    // hostname, not href: no paths or query strings from the host page leak out.
    const host = (typeof location !== "undefined" && location.hostname) || "unknown";
    url.searchParams.set("utm_source", host);
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "powered_by");
    url.searchParams.set("utm_content", "sdk-badge");
    return url.toString();
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
            `This key belongs to the '${slug}' platform. The localplug-sdk package is ` +
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
