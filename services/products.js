/**
 * Products — the site's display-only catalog.
 *
 * Rows of the platform's `product` type: name, description, price, gallery,
 * variations/sizes. LocalPlug SEO manages them in the dashboard; the site reads
 * them here. Only ACTIVE products are served, and the API returns this site's
 * own products plus the platform-wide shared pool — a site-specific product
 * wins when both exist under one slug.
 *
 * Deliberately not commerce: there is no cart, checkout or stock. It exists to
 * show products.
 */

export class ProductsModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * List products.
   *
   * @param {Object} [query]
   * @param {string} [query.category]  Filter by category
   * @param {number} [query.limit=100]
   * @param {number} [query.offset=0]
   *
   * @example
   * const { products } = await lps.products.list({ category: "flower" });
   */
  async list(query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    return this.client._fetch(`/api/site/products${qs ? `?${qs}` : ""}`);
  }

  /** One product by slug. Site-specific beats shared. */
  async get(slug) {
    return this.client._fetch(`/api/site/products/${encodeURIComponent(slug)}`);
  }

  /**
   * Convenience: the product's data (name/price/images/…) or null instead of a
   * 404 throw — so a page can render a fallback without try/catch everywhere.
   */
  async data(slug) {
    try {
      const { product } = await this.get(slug);
      return product?.data ?? null;
    } catch (err) {
      if (err?.status === 404) return null;
      throw err;
    }
  }
}
