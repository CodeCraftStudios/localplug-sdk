# localplugseo

The **LocalPlug SEO site SDK** — what a client website built by LocalPlug SEO
runs on. Private; installs from the repo, never npm.

```bash
npm install github:CodeCraftStudios/localplugseo-sdk
```

This SDK is **paired to the LocalPlug SEO platform**. Keys from any other
platform are rejected on first use — it will not serve another whitelabel.

## Keys

Every client site gets its own keys, issued in **LocalPlug SEO dashboard →
Websites → the site → API keys**. The value is shown once. Revoking a key cuts
off that one site; nothing else is affected.

```
dfd-site-secret-key-live-<random>    server-side only, full site surface
dfd-site-public-key-live-<random>    browser-safe; read-only + form/lead submits; origin-locked
```

These are NOT `dfd-platform-*` keys. A platform key belongs to the dashboard —
never put one in a website.

## Server usage

```js
// lib/lps.js
import { createSiteClient } from "localplugseo/server";

export const lps = createSiteClient();   // reads LPS_SITE_KEY
```

```bash
# .env — NOT NEXT_PUBLIC_*, or it lands in the browser bundle
LPS_SITE_KEY=dfd-site-secret-key-live-…
```

## Browser usage

Public keys may submit leads and forms directly from the browser — that's
visitor input by nature. Everything else they can only read.

```js
import { SiteClient } from "localplugseo";

const lps = new SiteClient({
  key: process.env.NEXT_PUBLIC_LPS_SITE_KEY, // public key only
});

await lps.leads.submit({
  name: "Jane Doe",
  business: "Green Leaf Dispensary",
  email: "jane@greenleaf.com",
  goal: "Rank for 'dispensary near me'",
});
```

Constructing the client with a **secret** key in a browser throws immediately,
and so does putting one in a `NEXT_PUBLIC_*` variable.

## What a site can do

| Module | Call | Notes |
| --- | --- | --- |
| Leads | `lps.leads.submit(data, { honeypot })` | Lands in the LocalPlug SEO inbox, tagged with this site |
| Content | `lps.content.list({ section })` / `.get(slug)` / `.data(slug)` | Managed copy edited in the dashboard; site-specific rows beat shared ones |
| Files | `lps.files.list()` / `.get(label)` / `.url(label)` | This site's files + shared brand assets; plain CDN URLs |
| Forms | `lps.forms.get(key)` / `.submit(key, values, { honeypot })` | Dashboard-built forms; submissions validated against the form's fields |
| — | `lps.whoami()` | Who am I: site, customer, platform, environment, modules |

Submissions are validated server-side, per-IP throttled, and honeypotted — pass
your hidden field's value as `honeypot` and bots get swallowed silently.

## Local development

```bash
LPS_API_URL=http://localhost:8000   # point at a local backend
```

Test-environment keys (`…-key-test-…`) skip the origin allowlist so localhost
just works.
