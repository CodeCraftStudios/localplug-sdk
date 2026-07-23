/**
 * Files — the site's slice of the LocalPlug SEO Files library.
 *
 * What comes back is this site's own files plus the platform's shared pool
 * (brand assets). URLs are plain public CDN URLs — safe to put straight into
 * <img src>, no expiry, no signing.
 */

export class FilesModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * List files.
   *
   * @param {Object} [query]
   * @param {string} [query.label]   Exact stable handle, e.g. "home-hero"
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
    return this.client._fetch(`/api/site/files${qs ? `?${qs}` : ""}`);
  }

  /** The file with this label, or null. */
  async get(label) {
    const { files } = await this.list({ label, limit: 1 });
    return files?.[0] ?? null;
  }

  /** Convenience: just the CDN URL for a label, or null. */
  async url(label) {
    const file = await this.get(label);
    return file?.url ?? null;
  }
}
