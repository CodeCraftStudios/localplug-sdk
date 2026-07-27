/**
 * Customers — email capture on the client site (newsletter boxes, loyalty
 * signups, checkout capture), delivered as `site_customer` records tagged
 * with the site they came from. The project's Customers tab in the LocalPlug
 * SEO dashboard reads exactly these.
 *
 * Works with a PUBLIC key: a signup is a write a visitor's browser is allowed
 * to make. The endpoint validates, throttles per IP, honeypots, and UPSERTS
 * by email — the same address subscribing twice refreshes one row.
 */

export class CustomersModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * Subscribe an email address.
   *
   * @param {Object} data  { email (required), name, phone, source, meta }
   *                       `source` defaults to the site's domain server-side;
   *                       pass one to segment ("footer-newsletter", "popup").
   * @param {Object} [options]
   * @param {string} [options.honeypot]  The value of your hidden form field. If a
   *                                     bot filled it, the API pretends success
   *                                     and writes nothing.
   * @returns {Promise<{created: boolean, id: string}>}  created=false means the
   *                                     email was already on the list (refreshed).
   *
   * @example
   * await lps.customers.subscribe({
   *   email: "jane@example.com",
   *   source: "footer-newsletter",
   * });
   */
  async subscribe(data, { honeypot } = {}) {
    return this.client._fetch("/api/site/customers", {
      method: "POST",
      body: JSON.stringify({ data, _hp: honeypot || "" }),
    });
  }
}
