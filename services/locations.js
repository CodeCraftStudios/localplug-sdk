/**
 * Locations — the client's store locations.
 *
 * The business name plus every location's public details: address, phone,
 * hours, Google Business Profile / maps links, photo. LocalPlug SEO maintains
 * them on the project's Locations tab; the site renders them here (location
 * pages, footers, contact pages).
 *
 * Only the public shape ever arrives — domain credentials and internal notes
 * stay on the dashboard side.
 */

export class LocationsModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * The full payload: { business_name, locations: [...] }.
   *
   * @example
   * const { business_name, locations } = await lps.locations.get();
   */
  async get() {
    return this.client._fetch("/api/site/locations");
  }

  /** Just the locations array — [] when nothing is filled in yet. */
  async list() {
    const { locations } = await this.get();
    return locations ?? [];
  }

  /**
   * One file by its label — the identifier the dashboard put on it
   * ("cover", "menu"). Returns the file object (its `url` is a permanent CDN
   * link) or null if nothing carries that label.
   *
   * Labels are per-LOCATION, so on a multi-location site pass the location id
   * to disambiguate; without it the first match across locations wins (which
   * is exactly right for single-location clients).
   *
   * @param {string} label
   * @param {string} [locationId]
   *
   * @example
   * const cover = await lps.locations.getFile("cover");
   * const ftwCover = await lps.locations.getFile("cover", ftw.id);
   */
  async getFile(label, locationId) {
    const locations = await this.list();
    for (const location of locations) {
      if (locationId && location.id !== locationId) continue;
      const hit = (location.files ?? []).find(
        (f) => (f.metadata && f.metadata.label) === label
      );
      if (hit) return hit;
    }
    return null;
  }

  /** Convenience: the labeled file's CDN url, or null. */
  async getFileUrl(label, locationId) {
    const file = await this.getFile(label, locationId);
    return file ? file.url : null;
  }
}
