import type { DocMeta, NavNode } from "./types";
import { checkAccess, getUserACLContext } from "@/lib/acl";
import type { UserACLContext } from "@/lib/acl";

interface NavBuildOptions {
  userTier?: string;
  userExtensions?: string[];
  showDrafts?: boolean;
}

export function buildNavTree(
  docs: DocMeta[],
  options: NavBuildOptions = {}
): NavNode[] {
  const { userTier = "public", userExtensions = [], showDrafts = false } = options;

  const userACL: UserACLContext | null =
    userTier === "public" && userExtensions.length === 0
      ? null
      : getUserACLContext(userTier, userExtensions);

  const filtered = docs.filter((doc) => {
    if (doc.nav_hidden) return false;
    if (doc.status === "draft" && !showDrafts) return false;
    if (doc.slug === "") return false;

    // Private-tier content is hidden from nav for unauthorized users
    const result = checkAccess(userACL, doc);
    if (!result.allowed && result.visibility === "private") return false;

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.nav_order !== b.nav_order) return a.nav_order - b.nav_order;
    return a.title.localeCompare(b.title);
  });

  // Build a Set of slugs that are parents of other docs — O(n) pre-computation
  const parentSlugs = new Set<string>();
  for (const doc of sorted) {
    const parts = doc.slug.split("/");
    for (let i = 1; i < parts.length; i++) {
      parentSlugs.add(parts.slice(0, i).join("/"));
    }
  }

  // Separate index pages from leaf pages.
  const indexPages = new Map<string, DocMeta>();
  const leafPages: DocMeta[] = [];

  for (const doc of sorted) {
    if (parentSlugs.has(doc.slug)) {
      indexPages.set(doc.slug, doc);
    } else {
      leafPages.push(doc);
    }
  }

  const root: NavNode[] = [];
  const nodeMap = new Map<string, NavNode>();

  // First pass: create section nodes from index pages
  // Sort by slug depth (parents first) so parent nodes exist before children
  const sortedIndexPages = [...indexPages.entries()].sort(
    ([a], [b]) => a.split("/").length - b.split("/").length
  );

  for (const [slug, doc] of sortedIndexPages) {
    const result = checkAccess(userACL, doc);
    const node: NavNode = {
      title: doc.title,
      href: `/docs/${slug}`,
      locked: !result.allowed,
      lockMessage: !result.allowed && result.requiredTier
        ? `${result.requiredTier.label} access required`
        : undefined,
      children: [],
    };
    nodeMap.set(slug, node);

    const parts = slug.split("/");
    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentSlug = parts.slice(0, -1).join("/");
      const parent = nodeMap.get(parentSlug);
      if (parent) {
        parent.children!.push(node);
      } else {
        root.push(node);
      }
    }
  }

  // Second pass: add leaf pages to their parent sections
  for (const doc of leafPages) {
    const parts = doc.slug.split("/");
    const result = checkAccess(userACL, doc);

    const node: NavNode = {
      title: doc.title,
      href: `/docs/${doc.slug}`,
      locked: !result.allowed,
      lockMessage: !result.allowed && result.requiredTier
        ? `${result.requiredTier.label} access required`
        : undefined,
    };

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentSlug = parts.slice(0, -1).join("/");
      const parent = nodeMap.get(parentSlug);
      if (parent) {
        parent.children!.push(node);
      } else {
        // Create implicit section node (no index page for this folder)
        const sectionNode: NavNode = {
          title: parentSlug.split("/").pop()!.replace(/-/g, " "),
          children: [node],
        };
        nodeMap.set(parentSlug, sectionNode);

        const grandparentSlug = parts.slice(0, -2).join("/");
        const grandparent = parts.length > 2 ? nodeMap.get(grandparentSlug) : null;
        if (grandparent) {
          grandparent.children!.push(sectionNode);
        } else {
          root.push(sectionNode);
        }
      }
    }
  }

  return root;
}

/**
 * Get the sidebar nav scoped to the current URL path.
 * Returns the nearest section with a "← Parent" back-link at the top.
 *
 * For /docs/extensions/compliance/gdpr-suite:
 *   ← Compliance & Legal       (back-link to parent)
 *   GDPR Compliance Suite      (current section, active)
 *     Configuration
 *     Roadmap
 */
export function getScopedNav(fullNav: NavNode[], pathname: string): NavNode[] {
  const path = pathname.replace(/^\/docs\/?/, "");
  if (!path) return fullNav;

  // Build the ancestry chain: [root match, child match, grandchild match, ...]
  function findAncestry(
    nodes: NavNode[],
    targetPath: string
  ): NavNode[] | null {
    for (const node of nodes) {
      if (!node.href) continue;
      const nodeSlug = node.href.replace(/^\/docs\/?/, "");

      if (targetPath === nodeSlug || targetPath.startsWith(nodeSlug + "/")) {
        if (node.children && node.children.length > 0) {
          const deeper = findAncestry(node.children, targetPath);
          if (deeper) return [node, ...deeper];
        }
        return [node];
      }
    }
    return null;
  }

  const chain = findAncestry(fullNav, path);
  if (!chain || chain.length === 0) return fullNav;

  // The deepest section with children is our sidebar root
  // Find it by walking backwards through the chain
  let sidebarRoot: NavNode | null = null;
  let parentNode: NavNode | null = null;

  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].children && chain[i].children!.length > 0) {
      sidebarRoot = chain[i];
      parentNode = i > 0 ? chain[i - 1] : null;
      break;
    }
  }

  if (!sidebarRoot) return fullNav;

  const result: NavNode[] = [];

  // Add "← Parent" back-link if there's a parent
  if (parentNode) {
    result.push({
      title: `← ${parentNode.title}`,
      href: parentNode.href,
    });
  }

  // Add the current section with its children
  result.push(sidebarRoot);

  return result;
}
