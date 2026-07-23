/**
 * Forms — dashboard-built forms the site renders and collects.
 *
 * A form's definition lives in the platform's `form` type (fields in the same
 * vocabulary records use); what visitors send lands as `form_submission`
 * records. Submission works with a PUBLIC key — it is visitor input by nature —
 * and is validated against the form's own required fields, throttled per IP,
 * and honeypotted, same as leads.
 */

export class FormsModule {
  constructor(client) {
    this.client = client;
  }

  /**
   * The form's definition: { form: { data: { key, name, fields, success_message } } }.
   * Site-specific beats shared when both exist under one key.
   */
  async get(formKey) {
    return this.client._fetch(`/api/site/forms/${encodeURIComponent(formKey)}`);
  }

  /**
   * Submit a filled form.
   *
   * The API stamps server-observed provenance on every submission (ip, user
   * agent, referer, language, timestamp). Pass `meta` for anything only the
   * page knows — the current URL, a session id, utm params — and it's stored
   * alongside; the server's own facts win on key collisions.
   *
   * @param {string} formKey
   * @param {Object} values  { fieldName: value } — checked against the form's fields
   * @param {Object} [options]
   * @param {string} [options.honeypot]  Value of your hidden form field.
   * @param {Object} [options.meta]      Extra context: { page, session, utm… }
   *
   * @example
   * await lps.forms.submit("free-audit",
   *   { email: "jane@greenleaf.com", url: "greenleaf.com" },
   *   { meta: { page: location.href } });
   */
  async submit(formKey, values, { honeypot, meta } = {}) {
    return this.client._fetch(
      `/api/site/forms/${encodeURIComponent(formKey)}/submissions`,
      {
        method: "POST",
        body: JSON.stringify({ values, _hp: honeypot || "", meta: meta || {} }),
      }
    );
  }
}
