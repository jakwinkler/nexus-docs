// AccessTier is now a free-form string — tiers are defined in the DB.
// Common values: "public", "client", "partner", "gold_partner", "platinum_partner", "admin"
export type AccessTier = string;
export type ContentStatus = "draft" | "published" | "deprecated";

export interface DocMeta {
  slug: string;
  title: string;
  summary: string;
  access_tier: AccessTier;
  product: string;
  status: ContentStatus;
  owner: string;
  extensions: string[];
  version: string;
  tags: string[];
  video?: string;
  changelog: boolean;
  last_verified_at?: string;
  review_interval_days: number;
  deprecated: boolean;
  redirect_from: string[];
  related: string[];
  nav_order: number;
  nav_hidden: boolean;
  lastModified: string;
}

export interface DocPage extends DocMeta {
  content: string;
}

export interface NavNode {
  title: string;
  href?: string;
  locked?: boolean;
  lockMessage?: string;
  children?: NavNode[];
}
