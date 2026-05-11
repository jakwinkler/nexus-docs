import type { UserACLContext, ContentACL, TierConfig, AccessCheckResult, TierVisibility } from "./types";

export type { UserACLContext, ContentACL, TierConfig, AccessCheckResult, TierVisibility };

// ─── Tier Registry ──────────────────────────────────
// Loaded from DB at startup, cached in memory.
// Fallback defaults if DB is unavailable (build time, tests).

// Hardcoded enum used by frontmatter validation at build time (no DB access).
// The four core tiers are public/client/partner/admin; gold_partner and
// platinum_partner are reference tiers showing how to add more — feel free
// to remove them from your fork or repurpose for your own business model.
// Future v0.2: make this fully DB-driven for true plugin-style tiers.
export const KNOWN_TIER_NAMES = [
  "public",
  "client",
  "partner",
  "gold_partner",
  "platinum_partner",
  "admin",
] as const;

export type KnownTierName = (typeof KNOWN_TIER_NAMES)[number];

const DEFAULT_TIERS: TierConfig[] = [
  { name: "public",            label: "Public",            rank: 0,   visibility: "public",    description: "Publicly visible to everyone" },
  { name: "client",            label: "Client",            rank: 10,  visibility: "protected", description: "Authenticated users with extension grants" },
  { name: "partner",           label: "Partner",           rank: 20,  visibility: "protected", description: "Trusted partners — bypass extension checks" },
  { name: "gold_partner",      label: "Gold Partner",      rank: 30,  visibility: "protected", description: "Higher-tier partners (example custom tier)", color: "#f59e0b" },
  { name: "platinum_partner",  label: "Platinum Partner",  rank: 40,  visibility: "private",   description: "Top-tier partners (example custom tier)",   color: "#a855f7" },
  { name: "admin",             label: "Admin",             rank: 100, visibility: "private",   description: "Full system access" },
];

let tierCache: Map<string, TierConfig> | null = null;

export function setTierRegistry(tiers: TierConfig[]): void {
  tierCache = new Map(tiers.map((t) => [t.name, t]));
}

export function getTierRegistry(): Map<string, TierConfig> {
  if (!tierCache) {
    tierCache = new Map(DEFAULT_TIERS.map((t) => [t.name, t]));
  }
  return tierCache;
}

export function getTier(name: string): TierConfig | undefined {
  return getTierRegistry().get(name);
}

export function getTierRank(name: string): number {
  return getTier(name)?.rank ?? 0;
}

export function getTierVisibility(name: string): TierVisibility {
  return getTier(name)?.visibility ?? "protected";
}

export function getAllTiers(): TierConfig[] {
  return [...getTierRegistry().values()].sort((a, b) => a.rank - b.rank);
}

// ─── Access Check ───────────────────────────────────

/**
 * Check if a user can access a document.
 * Returns both the access decision and visibility mode.
 */
export function checkAccess(
  user: UserACLContext | { tier: string; extensions: string[] } | null,
  doc: ContentACL
): AccessCheckResult {
  const docTier = getTier(doc.access_tier);

  // Unknown tier — fail closed. A typo in frontmatter must never expose a doc.
  if (!docTier) {
    console.warn(`[acl] Unknown access_tier "${doc.access_tier}" — denying access`);
    return { allowed: false, visibility: "private" };
  }

  const docRank = docTier.rank;
  const visibility = docTier.visibility;

  // Public content is accessible to everyone
  if (doc.access_tier === "public" || docRank === 0) {
    return { allowed: true, visibility: "public" };
  }

  // Anonymous users cannot access non-public content
  if (!user) {
    return { allowed: false, visibility, requiredTier: docTier };
  }

  // Resolve tierRank if not provided (backward compat for tests)
  const userRank = "tierRank" in user ? user.tierRank : getTierRank(user.tier);

  // User's tier rank meets or exceeds the doc's tier rank
  if (userRank >= docRank) {
    // For client-tier docs, only clients check extension gating.
    // Higher tiers (partner, admin) bypass extension checks.
    const clientRank = getTierRank("client");
    if (doc.access_tier === "client" && userRank === clientRank) {
      return checkExtensionAccess(user, doc, visibility, docTier);
    }
    return { allowed: true, visibility };
  }

  return { allowed: false, visibility, requiredTier: docTier };
}

function checkExtensionAccess(
  user: UserACLContext | { tier: string; extensions: string[] },
  doc: ContentACL,
  visibility: TierVisibility,
  docTier?: TierConfig
): AccessCheckResult {
  // If doc has explicit extensions list, check those
  if (doc.extensions.length > 0) {
    const hasExtension = doc.extensions.some((ext) => user.extensions.includes(ext));
    return hasExtension
      ? { allowed: true, visibility }
      : { allowed: false, visibility, requiredTier: docTier };
  }

  // If doc has a product field (not "platform"), check if user has matching permission
  if (doc.product && doc.product !== "platform") {
    const hasProduct = user.extensions.includes(doc.product);
    return hasProduct
      ? { allowed: true, visibility }
      : { allowed: false, visibility, requiredTier: docTier };
  }

  // No extensions and no specific product = any authenticated user can access
  return { allowed: true, visibility };
}

/**
 * Backward-compatible wrapper — returns boolean only.
 * Used by existing code that just needs allow/deny.
 */
export function canAccessDoc(
  user: UserACLContext | { tier: string; extensions: string[] } | null,
  doc: ContentACL
): boolean {
  return checkAccess(user, doc).allowed;
}

// ─── Search Filter ──────────────────────────────────

export function getAccessFilter(user: UserACLContext | { tier: string; extensions: string[] } | null): string {
  if (!user) {
    return 'access_tier = "public"';
  }

  const userRank = "tierRank" in user ? user.tierRank : getTierRank(user.tier);

  // Admin sees everything
  const adminTier = getTier("admin");
  if (adminTier && userRank >= adminTier.rank) {
    return "";
  }

  const clientRank = getTierRank("client");

  // Partner-rank+ users bypass extension checks (mirrors checkAccess logic).
  if (userRank > clientRank) {
    const accessibleTiers = getAllTiers()
      .filter((t) => t.rank <= userRank)
      .map((t) => `"${t.name}"`);
    return `access_tier IN [${accessibleTiers.join(", ")}]`;
  }

  // Below client rank — only public.
  if (userRank < clientRank) {
    return 'access_tier = "public"';
  }

  // Client-rank user — must mirror checkExtensionAccess:
  //   • doc.extensions non-empty: user must own at least one
  //   • doc.extensions empty + product != "platform": user must own product
  //   • doc.extensions empty + product == "platform": any client user
  const sanitized = user.extensions.map((e) => e.replace(/["\\]/g, ""));

  const clauses = [
    'access_tier = "public"',
    '(access_tier = "client" AND extensions IS EMPTY AND product = "platform")',
  ];

  if (sanitized.length > 0) {
    const extFilter = sanitized.map((e) => `"${e}"`).join(", ");
    clauses.push(
      `(access_tier = "client" AND extensions IN [${extFilter}])`,
      `(access_tier = "client" AND extensions IS EMPTY AND product IN [${extFilter}])`,
    );
  }

  return clauses.join(" OR ");
}

// ─── Helpers ────────────────────────────────────────

export function getUserACLContext(
  tierName: string,
  extensions: string[]
): UserACLContext {
  return {
    tier: tierName,
    tierRank: getTierRank(tierName),
    extensions,
  };
}
