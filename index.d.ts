/**
 * localplug-sdk — the LocalPlug SEO site SDK.
 * Paired to the LocalPlug SEO platform; runs on per-site dfd-site-* keys.
 */

export declare const PLATFORM_SLUG: "dispensary-local-seo";
export declare const PLATFORM_NAME: "LocalPlug SEO";

export interface SiteClientOptions {
  /** dfd-site-<public|secret>-key-<live|test>-<random>. Secret = server-side only. */
  key: string;
  /** Override the API host (local dev). */
  baseURL?: string;
}

export interface SiteWhoami {
  site: { id: string; name: string; domain: string };
  customer: string | null;
  platform: { slug: string; name: string };
  key: { kind: "public" | "secret"; environment: "live" | "test" };
  modules: string[];
}

export interface SiteApiError extends Error {
  status?: number;
  code?: string;
  payload?: unknown;
}

export interface ContentRecord {
  id: string;
  type: string;
  status: string;
  data: {
    slug?: string;
    site?: string;
    section?: string;
    title?: string;
    body?: string;
    image_url?: string;
    extra?: unknown;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface SiteFile {
  id: string;
  name: string;
  /** Platform-wide unique handle (may be ""). Per-location labels live in metadata.label. */
  label: string;
  url: string;
  content_type: string;
  size_bytes: number;
  alt: string;
  /** Key-value stamps — e.g. { location: "loc_…", label: "cover" }. */
  metadata: Record<string, unknown>;
  customer: string | null;
  website_record: string | null;
  created_at: string | null;
  /** Blur-up placeholder + responsive WebP variants, when generated. */
  lqip?: string | null;
  variants_ready?: boolean;
  variants?: Record<string, { width: number; url: string }[]>;
  [key: string]: unknown;
}

export interface FormField {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: unknown[];
  [key: string]: unknown;
}

export interface FormRecord {
  id: string;
  type: string;
  status: string;
  data: {
    key?: string;
    name?: string;
    site?: string;
    fields?: FormField[];
    success_message?: string;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  url: string;
  alt?: string;
  [key: string]: unknown;
}

export interface ProductVariantOption {
  name: string;
  /** Absent/null means the product's base price applies. */
  price?: number | null;
  /** Optional option-specific image URL (e.g. a flavor shot). */
  image?: string;
  [key: string]: unknown;
}

export interface ProductVariant {
  /** e.g. "Size", "Flavor". */
  label: string;
  options: ProductVariantOption[];
}

export interface ProductRecord {
  id: string;
  type: string;
  /** Only "active" products are ever served to a site. */
  status: string;
  data: {
    slug?: string;
    site?: string;
    /** The dashboard project this product is managed under. */
    project?: string;
    name?: string;
    category?: string;
    price?: number | string;
    compare_at_price?: number | string;
    description?: string;
    /** The hero shot — lead with this; fall back to images[0]. */
    main_image?: ProductImage | null;
    images?: ProductImage[];
    variants?: ProductVariant[];
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface Paged {
  total: number;
  limit: number;
  offset: number;
}

export declare class LeadsModule {
  constructor(client: SiteClient);
  submit(
    data: Record<string, unknown>,
    options?: { honeypot?: string }
  ): Promise<{ created: true; id?: string }>;
}

export declare class ContentModule {
  constructor(client: SiteClient);
  list(query?: {
    section?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ content: ContentRecord[] } & Paged>;
  get(slug: string): Promise<{ content: ContentRecord }>;
  data(slug: string): Promise<ContentRecord["data"] | null>;
}

export declare class FilesModule {
  constructor(client: SiteClient);
  list(query?: {
    label?: string;
    /** Folder NAME or full path (e.g. "GALLERY") — how galleries pull a set. */
    folder?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ files: SiteFile[] } & Paged>;
  get(label: string): Promise<SiteFile | null>;
  url(label: string): Promise<string | null>;
}

export declare class FormsModule {
  constructor(client: SiteClient);
  get(formKey: string): Promise<{ form: FormRecord }>;
  /**
   * The API stamps ip/user-agent/referer/language/timestamp server-side; pass
   * `meta` for page-known context (current URL, session id, utm…).
   */
  submit(
    formKey: string,
    values: Record<string, unknown>,
    options?: { honeypot?: string; meta?: Record<string, unknown> }
  ): Promise<{ created: true; id?: string }>;
}

export interface SiteLocation {
  /** Stable location id — what its files are keyed by. */
  id: string;
  /**
   * EVERYTHING about the location, dashboard-authored: conventional keys are
   * name, address, phone, email, hours, gpb, maps, instagram, facebook,
   * tiktok, neighborhood, highlights, seo_title, seo_description — but any
   * shape a site needs can live here.
   */
  metadata: Record<string, unknown>;
  /** This location's files (photos, menus) from the Files library. */
  files: SiteFile[];
}

export declare class LocationsModule {
  constructor(client: SiteClient);
  /** The full payload: business name + locations. */
  get(): Promise<{ business_name: string; locations: SiteLocation[] }>;
  /** Just the locations array — [] when nothing is filled in yet. */
  list(): Promise<SiteLocation[]>;
  /**
   * One file by its dashboard-assigned label ("cover", "menu"), or null.
   * Labels are per-location — pass locationId on multi-location sites.
   */
  getFile(label: string, locationId?: string): Promise<SiteFile | null>;
  /** The labeled file's CDN url, or null. */
  getFileUrl(label: string, locationId?: string): Promise<string | null>;
}

/** A stored marketing touch: where the visitor came from. */
export interface AttributionTouch {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  referrer?: string;
  /** Full landing URL of the touch. */
  landing?: string;
  /** ISO timestamp the touch was captured. */
  at?: string;
}

export interface InsightsInitOptions {
  /** Fire pageviews automatically (history patching). Default true. */
  autoPageviews?: boolean;
  /** Capture clicks on links/buttons/[data-track]. Default true. */
  autoClicks?: boolean;
  /** Buffer flush cadence in ms. Default 8000. */
  flushIntervalMs?: number;
}

/**
 * First-party analytics. Browser-only (every method no-ops on the server) and
 * silent on every failure — analytics must never break a site. Works with the
 * PUBLIC site key; events land in the LocalPlug SEO dashboard's Visitors panel.
 */
export declare class InsightsModule {
  constructor(client: SiteClient);
  /** Start collecting. Idempotent; no-op on the server. */
  init(options?: InsightsInitOptions): { active: boolean };
  /** Stop collecting, remove listeners, flush what's buffered. */
  destroy(): void;
  /** Track a pageview (automatic unless autoPageviews: false). */
  pageview(path?: string): void;
  /** Track a custom event. */
  track(name: string, props?: Record<string, unknown>): void;
  /** Record a goal completion (lead sent, booking made…). */
  conversion(value?: number, props?: Record<string, unknown>): void;
  /** App Router hook: fires a pageview when the path actually changed. */
  notifyRouteChange(path?: string): void;
  getVisitorId(): string;
  getSessionId(): string;
  getAttribution(): { ft: AttributionTouch; lt: AttributionTouch };
  /** Compact payload to attach to a lead/form submission's meta. */
  attributionForOrder(): {
    visitor_id: string;
    session_id: string;
    ft: AttributionTouch;
    lt: AttributionTouch;
  };
}

export declare class ProductsModule {
  constructor(client: SiteClient);
  list(query?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ products: ProductRecord[] } & Paged>;
  /** One product by slug. Site-specific beats shared. */
  get(slug: string): Promise<{ product: ProductRecord }>;
  /** The product's data, or null on 404 instead of a throw. */
  data(slug: string): Promise<ProductRecord["data"] | null>;
}

export interface CategoryRecord {
  id: string;
  type: string;
  /** Only "active" categories are ever served to a site. */
  status: string;
  data: {
    slug?: string;
    site?: string;
    project?: string;
    /** Parent category RECORD ID ("" / absent = root). */
    parent?: string;
    name?: string;
    navbar_name?: string;
    short_description?: string;
    /** Rich HTML — the category page's body copy. */
    description?: string;
    /** {title, description, keywords, schema} — the page's meta tags. */
    seo?: Record<string, unknown>;
    custom_fields?: Record<string, unknown>;
    display_order?: number;
    show_in_home?: boolean;
    [key: string]: unknown;
  };
  /**
   * The category's images from the project's Files library — each optionally
   * labeled via metadata.label ("main", "hero", "hero_mobile", "og");
   * unlabeled files are the gallery.
   */
  files: SiteFile[];
  created_at: string;
  updated_at: string;
}

export declare class CategoriesModule {
  constructor(client: SiteClient);
  /** Every active category (flat — nest via `parent`), by display_order. */
  list(): Promise<CategoryRecord[]>;
  /** One category by slug. Site-specific beats shared; 404s reject. */
  get(slug: string): Promise<CategoryRecord>;
  /** The category's labeled file ("main", "hero", "og"…), or null. */
  getFile(slug: string, label: string): Promise<SiteFile | null>;
  /** Every file WITHOUT a reserved label — the gallery. */
  gallery(slug: string): Promise<SiteFile[]>;
}

export declare class SiteClient {
  constructor(options: SiteClientOptions);

  key: string;
  kind: "public" | "secret";
  environment: "live" | "test";
  baseURL: string;
  readonly isServerSide: boolean;

  leads: LeadsModule;
  categories: CategoriesModule;
  content: ContentModule;
  files: FilesModule;
  forms: FormsModule;
  insights: InsightsModule;
  products: ProductsModule;
  locations: LocationsModule;

  whoami(): Promise<SiteWhoami>;
}

export default SiteClient;

/** Server-only entry ("localplug-sdk/server"). */
export declare function createSiteClient(options?: {
  key?: string;
  baseURL?: string;
}): SiteClient;
