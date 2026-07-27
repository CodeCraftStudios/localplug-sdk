/**
 * Giveaways & deals — the /deals-and-giveaways page's data.
 *
 * Reads (cards, recent winners, live deals) work with the public key. The
 * entry submit also runs on the public key: the endpoint is public_write and
 * hardened server-side (honeypot, throttle, server-side 21+ gate, E.164
 * dedupe) — the browser posts the form straight to it.
 *
 * The one-tap return path rides `entry_token`: keep the token the enter()
 * response returns (localStorage/cookie on the site's own domain), pass it to
 * list() for per-card `entered` flags, and to enter() to skip the form.
 */

export class GiveawaysModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * The page payload: current giveaway cards (with display state + human
   * dates), the public Recent Winners list (first name + last initial only),
   * and the site's schedule line.
   *
   * @param {Object} [query]
   * @param {string} [query.entry_token]  Returning visitor's token -> `entered` flags
   */
  async list(query = {}) {
    const params = new URLSearchParams();
    if (query.entry_token) params.set("entry_token", query.entry_token);
    const qs = params.toString();
    return this.client._fetch(`/api/site/giveaways${qs ? `?${qs}` : ""}`);
  }

  /**
   * Enter a giveaway.
   *
   * One-tap return: `{ giveaway_id, entry_token }` alone is enough for a
   * known subscriber. First time (or lost cookie): send the four form fields
   * (+ optional sms_consent, utm_*). Always idempotent — an already-entered
   * person gets `{ ok: true, state: "entered", already_entered: true }`.
   *
   * @param {Object} payload
   * @param {string} payload.giveaway_id
   * @param {string} [payload.entry_token]
   * @param {string} [payload.first_name]
   * @param {string} [payload.email]
   * @param {string} [payload.phone]
   * @param {string} [payload.date_of_birth]  YYYY-MM-DD
   * @param {boolean} [payload.sms_consent]
   * @param {string} [payload.company_website]  Honeypot — leave empty
   */
  async enter(payload) {
    return this.client._fetch(`/api/site/giveaways/enter`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export class DealsModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * Live deals only, computed from timestamps at request time. Cards render
   * as adverts (badge, title, one-liner, category link) — never a form.
   */
  async list() {
    return this.client._fetch(`/api/site/deals`);
  }
}
