/**
 * localplugseo — the LocalPlug SEO site SDK.
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
  label: string;
  url: string;
  content_type: string;
  size_bytes: number;
  alt: string;
  customer: string | null;
  website_record: string | null;
  created_at: string | null;
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
    limit?: number;
    offset?: number;
  }): Promise<{ files: SiteFile[] } & Paged>;
  get(label: string): Promise<SiteFile | null>;
  url(label: string): Promise<string | null>;
}

export declare class FormsModule {
  constructor(client: SiteClient);
  get(formKey: string): Promise<{ form: FormRecord }>;
  submit(
    formKey: string,
    values: Record<string, unknown>,
    options?: { honeypot?: string }
  ): Promise<{ created: true; id?: string }>;
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

  whoami(): Promise<SiteWhoami>;
}

export default SiteClient;

/** Server-only entry ("localplugseo/server"). */
export declare function createSiteClient(options?: {
  key?: string;
  baseURL?: string;
}): SiteClient;
