# localplug-sdk

The **LocalPlug SEO site SDK** — what a client website built by LocalPlug SEO
runs on. Private; installs from the repo, never npm.

```bash
npm install github:CodeCraftStudios/localplug-sdk
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
import { createSiteClient } from "localplug-sdk/server";

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
import { SiteClient } from "localplug-sdk";

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

## `<DashImage />`

The LQIP blur-up image component, from the subpath (keeps the client component
out of server entries):

```jsx
import { DashImage } from "localplug-sdk/react/DashImage";

<DashImage image={file} alt="Storefront" sizes="(min-width:1024px) 50vw, 100vw" />
```

`image` is any platform file object (`lps.files`, a location's files, a
product image) — WebP `srcset` + blur-up kick in automatically when the file
carries variants; a bare `src` works as a drop-in `<img>` replacement. Add
`transpilePackages: ["localplug-sdk"]` to `next.config` (it ships `.jsx`).

## `npx localplug build`

Build + CDN deploy in one step — wire it in as the site's build script:

```jsonc
// package.json
"scripts": { "build": "localplug build" }
```

```bash
npx localplug build          # next build + upload changed assets + activate
npx localplug build --dry-run
npx localplug status         # active deployment + the site's asset prefix
```

It resolves the site's CDN prefix BEFORE `next build` (a runtime-only prefix
silently kills hydration), builds with `NEXT_PUBLIC_ASSET_PREFIX` baked in,
uploads only new files (content-addressed dedup) to the site's own namespace,
and activates atomically. `next.config` needs:

```js
assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
```

Auth is the site **secret** key (`LPS_SITE_KEY` in `.env.local`). Anything
missing or failing degrades to a plain `next build` served from the origin —
a deploy never goes red because the CDN hiccuped.

## Local development

```bash
LPS_API_URL=http://localhost:8000   # point at a local backend
```

Test-environment keys (`…-key-test-…`) skip the origin allowlist so localhost
just works.
