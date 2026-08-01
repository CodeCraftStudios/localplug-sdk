/**
 * Klaviyo — one account PER SITE, driven from the site itself.
 *
 * Every brand has its own Klaviyo account, because an unsubscribe, a sending
 * domain and a sender reputation are all account-wide in Klaviyo: share an
 * account across brands and one person unsubscribing from Gas House silently
 * stops their Plug Houston email too.
 *
 * This module does three things and nothing else:
 *
 *   1. creates the Klaviyo profile (every field the form collected)
 *   2. subscribes it to the brand's email list, WITH consent
 *   3. fires the trigger events the flows hang off
 *
 * Flows, delays, templates, copy and campaigns are built in Klaviyo. Nothing
 * about them lives in code — this only has to put the right person and the
 * right event into the right account.
 *
 *   BROWSER-SAFE BY DESIGN
 *
 * These are Klaviyo's `/client/*` endpoints, which authenticate with the
 * PUBLIC key (the six-character company id, the same one Klaviyo's own signup
 * forms ship in page source) and are built for browser use. There is no
 * private key in the bundle and nothing here can read your list, only add to
 * it. Configure it on the client:
 *
 *   new SiteClient({
 *     key: process.env.NEXT_PUBLIC_LPS_SITE_KEY,
 *     klaviyo: {
 *       publicKey: process.env.NEXT_PUBLIC_KLAVIYO_PUBLIC_KEY,  // e.g. "TWptY6"
 *       listId:    process.env.NEXT_PUBLIC_KLAVIYO_LIST_ID,     // e.g. "Uxpwsc"
 *     },
 *   })
 *
 *   EXACTLY-ONCE, WITHOUT ANY STATE
 *
 * Every call carries a `unique_id`. Klaviyo keeps only the FIRST event with a
 * given (metric, profile, unique_id) and silently drops the rest, so:
 *
 *   - a double-tapped Enter button sends one confirmation, not two
 *   - the welcome email goes to a person once, ever, however many giveaways
 *     they enter afterwards
 *   - a retry after a flaky connection is free
 *
 * That is why this needs no "have I already sent this" bookkeeping, and why it
 * is safe to call on every successful entry rather than only on a new one —
 * the site cannot tell a first-time entrant from a returning one anyway (the
 * entry endpoint does not say), and with the unique_id it does not have to.
 */

const KLAVIYO_API = "https://a.klaviyo.com/client";
const REVISION = "2025-01-15";

/** The metrics the three flows trigger on. Names must match Klaviyo exactly. */
export const KLAVIYO_EVENTS = {
  ENTERED: "Giveaway Entered",
  SUBSCRIBED: "Subscriber Created",
  WON: "Giveaway Won",
};

export class KlaviyoModule {
  constructor(client, config = {}) {
    this.client = client;
    this.publicKey = (config.publicKey || "").trim();
    this.listId = (config.listId || "").trim();
  }

  /** Whether this site has been given an account to talk to. */
  get configured() {
    return Boolean(this.publicKey);
  }

  async _post(path, body) {
    if (!this.configured) return false;
    const res = await fetch(
      `${KLAVIYO_API}${path}?company_id=${encodeURIComponent(this.publicKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json", revision: REVISION },
        body: JSON.stringify(body),
        keepalive: true, // survive the page navigating away right after entry
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const error = new Error(
        `Klaviyo ${path} failed (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`
      );
      error.status = res.status;
      throw error;
    }
    return true;
  }

  /**
   * Create or update the profile with everything the entry form collected.
   *
   * Klaviyo has native fields for name, email and phone; date of birth, SMS
   * consent and the flyer attribution are custom properties. They are sent
   * because they are what segments get built from later — the QR code on a
   * specific shop's flyer carries its own utm_content, so "everyone who signed
   * up at Beechnut" stays answerable.
   */
  async identify(person) {
    // EMPTY VALUES ARE DROPPED, not sent as "".
    //
    // The one-tap return path knows the entrant's email and nothing else, so a
    // blindly-built payload would write date_of_birth:"" and sms_consent:false
    // straight over the real values captured when they first signed up. A
    // profile update only touches the keys it is given, so the fix is to give
    // it fewer keys.
    const properties = {};
    const set = (key, value) => {
      if (value !== undefined && value !== null && value !== "") properties[key] = value;
    };
    set("date_of_birth", person.date_of_birth);
    set("brand", person.brand);
    set("site", person.site);
    set("utm_source", person.utm_source);
    set("utm_medium", person.utm_medium);
    set("utm_campaign", person.utm_campaign);
    set("utm_content", person.utm_content);
    set("utm_term", person.utm_term);
    if (person.utm_source) properties.signup_source = person.utm_source;
    // A boolean false is meaningful and must survive the filter above — but
    // only when the caller actually said so.
    if (person.sms_consent !== undefined) properties.sms_consent = Boolean(person.sms_consent);
    Object.assign(properties, person.properties || {});

    return this._post("/profiles/", {
      data: {
        type: "profile",
        attributes: {
          email: person.email,
          ...(person.phone ? { phone_number: person.phone } : {}),
          ...(person.first_name ? { first_name: person.first_name } : {}),
          properties,
        },
      },
    });
  }

  /**
   * Subscribe to the brand's list WITH email marketing consent.
   *
   * Membership and consent are two different things in Klaviyo. A profile
   * added to a list without consent is a member who is unsubscribed, and a
   * campaign sends to nobody who is unsubscribed — a list built that way looks
   * full and mails zero people. This endpoint is the one that records consent,
   * which the entry form's disclosure is what earns.
   */
  async subscribe(person, { listId = this.listId, source = "Giveaway entry" } = {}) {
    if (!listId) return false;
    const profileAttributes = {
      email: person.email,
      subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } },
    };
    if (person.first_name) profileAttributes.first_name = person.first_name;
    // SMS is NOT live. The phone is stored on the profile, but no SMS consent
    // is ever sent to Klaviyo, so nothing here can start texting anybody.
    if (person.phone) profileAttributes.phone_number = person.phone;

    return this._post("/subscriptions/", {
      data: {
        type: "subscription",
        attributes: {
          custom_source: source,
          profile: { data: { type: "profile", attributes: profileAttributes } },
        },
        relationships: { list: { data: { type: "list", id: listId } } },
      },
    });
  }

  /** Fire one event. `uniqueId` is what makes it safe to call twice. */
  async track(metric, email, properties = {}, { uniqueId = "", at = "" } = {}) {
    const attributes = {
      properties,
      metric: { data: { type: "metric", attributes: { name: metric } } },
      profile: { data: { type: "profile", attributes: { email } } },
    };
    if (uniqueId) attributes.unique_id = uniqueId;
    if (at) attributes.time = at;
    return this._post("/events/", { data: { type: "event", attributes } });
  }

  /**
   * The whole thing, for one successful entry: profile -> list -> triggers.
   *
   * Call it after the entry endpoint has said ok. Never before: the server is
   * what decides whether someone is 21, whether the giveaway is open and
   * whether the phone number is a duplicate, and a profile created for a
   * rejected entry is a person on the list who was told they did not get in.
   *
   * Best-effort by contract. It resolves either way and never throws into the
   * page — the entry is already saved server-side, and a page that shows an
   * error after a successful entry teaches people to enter twice.
   */
  async entered(person, giveaway, options = {}) {
    if (!this.configured || !person?.email) return { ok: false, skipped: true };

    const errors = [];
    const attempt = async (label, fn) => {
      try {
        await fn();
      } catch (err) {
        errors.push(`${label}: ${err.message}`);
      }
    };

    const shared = {
      brand_name: person.brand || "",
      domain: person.site || "",
      first_name: person.first_name || "",
    };

    await attempt("profile", () => this.identify(person));
    await attempt("subscribe", () => this.subscribe(person, options));

    // Flow B — the welcome. Keyed on the PERSON, so it is sent once ever, no
    // matter how many weeks they come back and enter again.
    await attempt("subscriber-created", () =>
      this.track(
        KLAVIYO_EVENTS.SUBSCRIBED,
        person.email,
        {
          ...shared,
          announce_at: giveaway?.announce_at_human || "",
          sms_consent: Boolean(person.sms_consent),
          signup_source: person.utm_source || "site",
          utm_content: person.utm_content || "",
          // SMS is not live. This records what they agreed to for later; no
          // SMS consent is ever sent to Klaviyo, so nothing can text them.
        },
        { uniqueId: `subscriber:${person.email.toLowerCase()}` }
      )
    );

    // Flow A — the entry confirmation. Keyed on person + giveaway, matching
    // the one-entry-per-person-per-giveaway rule the database enforces.
    if (giveaway?.id) {
      await attempt("giveaway-entered", () =>
        this.track(
          KLAVIYO_EVENTS.ENTERED,
          person.email,
          {
            ...shared,
            prize_title: giveaway.prize_title || "",
            prize_description: giveaway.prize_description || "",
            prize_image_url: giveaway.prize_image_url || "",
            closes_at: giveaway.closes_at_human || "",
            announce_at: giveaway.announce_at_human || "",
            entry_url: person.site ? `https://${person.site}/deals-and-giveaways` : "",
            giveaway_id: giveaway.id,
          },
          { uniqueId: `entered:${giveaway.id}:${person.email.toLowerCase()}` }
        )
      );
    }

    if (errors.length && typeof console !== "undefined") {
      // Visible in the console for anyone debugging a missing email, silent to
      // the person who just entered.
      console.warn("[localplug-sdk] Klaviyo:", errors.join(" | "));
    }
    return { ok: errors.length === 0, errors };
  }
}
