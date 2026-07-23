/**
 * Content — the managed copy a site renders.
 *
 * Rows of the platform's `site_content` type: a slug, an optional section, a
 * title, an HTML/markdown body, an image and app-shaped extras. LocalPlug SEO
 * edits them in the dashboard; the site reads them here. The API returns this
 * site's own rows plus the platform-wide shared pool — a site-specific row wins
 * when both exist under one slug.
 */

export class ContentModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * List content rows.
   *
   * @param {Object} [query]
   * @param {string} [query.section]  e.g. "home", "footer"
   * @param {number} [query.limit=100]
   * @param {number} [query.offset=0]
   */
  async list(query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.client._fetch(`/api/site/content${qs ? `?${qs}` : ""}`);
  }

  /** One row by slug. Site-specific beats shared. */
  async get(slug) {
    return this.client._fetch(`/api/site/content/${encodeURIComponent(slug)}`);
  }

  /**
   * Convenience: the row's data (title/body/…) or null instead of a 404 throw —
   * so a page can render a fallback without try/catch at every call site.
   */
  async data(slug) {
    try {
      const { content } = await this.get(slug);
      return content?.data ?? null;
    } catch (err) {
      if (err?.status === 404) return null;
      throw err;
    }
  }
}
