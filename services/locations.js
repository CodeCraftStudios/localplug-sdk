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
}
