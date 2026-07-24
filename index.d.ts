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

export declare class SiteClient {
  constructor(options: SiteClientOptions);

  key: string;
  kind: "public" | "secret";
  environment: "live" | "test";
  baseURL: string;
  readonly isServerSide: boolean;

  leads: LeadsModule;
  content: ContentModule;
  files: FilesModule;
  forms: FormsModule;
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
