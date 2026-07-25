/**
 * Categories — the catalog's grouping tree, managed on the project's Products
 * tab in the LocalPlug SEO dashboard.
 *
 * A category is a full PAGE's worth of data: name, slug, rich description,
 * SEO ({title, description, keywords, schema}), free-form custom_fields, and
 * its FILES — images from the project's library stamped to the category, each
 * optionally labeled ("main", "hero", "hero_mobile", "og"; everything else is
 * the gallery). Nesting is the `parent` field (another category's id); the
 * tree is assembled client-side however the site wants it.
 *
 * Products join by SLUG: lps.products.list({ category: cat.slug }).
 */

export class CategoriesModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * Every active category, ordered by display_order. Each carries `files`.
   *
   * @example
   * const categories = await lps.categories.list();
   * const roots = categories.filter((c) => !c.parent);
   */
  async list() {
    const { categories } = await this.client._fetch("/api/site/categories");
    return categories ?? [];
  }

  /**
   * One category by slug — site-specific beats shared. 404s reject.
   *
   * @example
   * const cat = await lps.categories.get("thca-flower");
   */
  async get(slug) {
    const { category } = await this.client._fetch(
      `/api/site/categories/${encodeURIComponent(slug)}`
    );
    return category;
  }

  /**
   * A category's labeled file ("main", "hero", "og"…), or null.
   *
   * @example
   * const hero = await lps.categories.getFile("thca-flower", "hero");
   */
  async getFile(slug, label) {
    const category = await this.get(slug);
    return (
      (category.files ?? []).find(
        (f) => (f.metadata && f.metadata.label) === label
      ) ?? null
    );
  }

  /** The gallery: every file WITHOUT a reserved label, in upload order. */
  async gallery(slug) {
    const category = await this.get(slug);
    const reserved = new Set(["main", "hero", "hero_mobile", "og"]);
    return (category.files ?? []).filter(
      (f) => !reserved.has((f.metadata && f.metadata.label) || "")
    );
  }
}
