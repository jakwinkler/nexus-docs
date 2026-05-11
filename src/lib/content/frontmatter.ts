import { z } from "zod";
import { KNOWN_TIER_NAMES } from "@/lib/acl";

export const frontmatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  access_tier: z.enum(KNOWN_TIER_NAMES),
  product: z.string().min(1),
  status: z.enum(["draft", "published", "deprecated"]),
  owner: z.string().min(1),
  extensions: z.array(z.string()).default([]),
  version: z.string().default("*"),
  tags: z.array(z.string()).default([]),
  video: z.string().optional(),
  changelog: z.boolean().default(false),
  last_verified_at: z.string().optional(),
  review_interval_days: z.number().default(90),
  deprecated: z.boolean().default(false),
  redirect_from: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
  nav_order: z.number().default(0),
  nav_hidden: z.boolean().default(false),
});

export type FrontmatterInput = z.input<typeof frontmatterSchema>;
export type Frontmatter = z.output<typeof frontmatterSchema>;

export function validateFrontmatter(data: unknown): Frontmatter {
  return frontmatterSchema.parse(data);
}
