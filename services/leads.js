/**
 * Leads — the site's contact form, delivered straight into the LocalPlug SEO
 * inbox as a `contact` record tagged with the site it came from.
 *
 * Works with a PUBLIC key: lead submission is the one write a visitor's browser
 * is allowed to make. The endpoint validates, throttles per IP, and honeypots.
 */

export class LeadsModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * Submit a lead.
   *
   * @param {Object} data  Fields of the platform's `contact` schema:
   *                       { name, business, email, phone, locations, goal, meta… }
   * @param {Object} [options]
   * @param {string} [options.honeypot]  The value of your hidden form field. If a
   *                                     bot filled it, the API pretends success
   *                                     and writes nothing.
   *
   * @example
   * await lps.leads.submit({
   *   name: "Jane Doe",
   *   business: "Green Leaf Dispensary",
   *   email: "jane@greenleaf.com",
   *   goal: "Rank for 'dispensary near me'",
   * });
   */
  async submit(data, { honeypot } = {}) {
    return this.client._fetch("/api/site/leads", {
      method: "POST",
      body: JSON.stringify({ data, _hp: honeypot || "" }),
    });
  }
}
