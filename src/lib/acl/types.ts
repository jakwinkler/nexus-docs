export type TierVisibility = "public" | "protected" | "private";

export interface TierConfig {
  name: string;
  label: string;
  rank: number;
  visibility: TierVisibility;
  description?: string;
  color?: string;
}

export interface UserACLContext {
  tier: string;      // tier name, e.g. "gold_partner"
  tierRank: number;  // resolved rank, e.g. 30
  extensions: string[];
}

export interface ContentACL {
  access_tier: string;
  extensions: string[];
  product?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  visibility: TierVisibility;  // how this content appears if not allowed
  requiredTier?: TierConfig;   // the tier needed to access this content
}
