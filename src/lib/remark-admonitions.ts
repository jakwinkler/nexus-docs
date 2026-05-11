/**
 * Remark plugin that converts markdown admonition syntax to <Admonition> JSX.
 *
 * Supports three syntaxes:
 *
 * 1. VitePress/Docusaurus style (:::)
 *    :::tip Custom Title
 *    Content here
 *    :::
 *
 * 2. MkDocs style (!!!)
 *    !!! warning "Title Here"
 *        Indented content here
 *
 * 3. MkDocs collapsible (??? and ???+)
 *    ??? note "Collapsed by default"
 *        Content here
 *    ???+ note "Open by default"
 *        Content here
 *
 * All get converted to: <Admonition type="..." title="...">Content</Admonition>
 * Collapsible ones get: <Collapsible title="...">Content</Collapsible>
 */

// Type mapping from various platforms to our supported types
const TYPE_MAP: Record<string, string> = {
  // Direct matches
  note: "note",
  tip: "tip",
  info: "info",
  warning: "warning",
  danger: "danger",
  success: "success",
  // MkDocs aliases
  abstract: "info",
  summary: "info",
  tldr: "info",
  question: "info",
  help: "info",
  faq: "info",
  example: "info",
  quote: "info",
  cite: "info",
  bug: "danger",
  failure: "danger",
  fail: "danger",
  missing: "danger",
  error: "danger",
  caution: "warning",
  attention: "warning",
  important: "warning",
  // Docusaurus
  "note[docusaurus]": "note",
};

function mapType(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return TYPE_MAP[lower] || "note";
}

export function remarkAdmonitions() {
  return (tree: { type: string; children: Array<{ type: string; value?: string }> }) => {
    // We operate on the raw MDX string before AST parsing
    // This is actually a string preprocessor, not a true remark plugin
    // But it integrates cleanly with MDXRemote
  };
}

/**
 * Preprocess markdown source to convert ::: and !!! admonitions to JSX.
 * Call this BEFORE passing source to MDXRemote.
 */
export function preprocessAdmonitions(source: string): string {
  let result = source;

  // 1. Convert ::: syntax (VitePress/Docusaurus style)
  // :::tip Custom Title
  // Content
  // :::
  result = result.replace(
    /^:::(\w+)(?: ([^\n]+))?\n([\s\S]*?)^:::\s*$/gm,
    (_match, type: string, title: string | undefined, content: string) => {
      const mappedType = mapType(type);
      const trimmedContent = content.trim();
      if (title && title.trim()) {
        return `<Admonition type="${mappedType}" title="${title.trim()}">\n${trimmedContent}\n</Admonition>`;
      }
      return `<Admonition type="${mappedType}">\n${trimmedContent}\n</Admonition>`;
    }
  );

  // 2. Convert !!! syntax (MkDocs style)
  // !!! warning "Title"
  //     Indented content (4 spaces)
  result = result.replace(
    /^!{3}\s+(\w+)(?:\s+"([^"]*)")?\s*\n((?:^(?:    |\t).+\n?)*)/gm,
    (_match, type: string, title: string | undefined, content: string) => {
      const mappedType = mapType(type);
      // Remove 4-space indent from content
      const trimmedContent = content
        .replace(/^(?:    |\t)/gm, "")
        .trim();
      if (title) {
        return `<Admonition type="${mappedType}" title="${title}">\n${trimmedContent}\n</Admonition>`;
      }
      return `<Admonition type="${mappedType}">\n${trimmedContent}\n</Admonition>`;
    }
  );

  // 3. Convert ??? and ???+ syntax (MkDocs collapsible)
  // ??? note "Collapsed title"
  //     Content
  // ???+ note "Open by default title"
  //     Content
  result = result.replace(
    /^\?{3}\+?\s+(\w+)(?:\s+"([^"]*)")?\s*\n((?:^(?:    |\t).+\n?)*)/gm,
    (_match, type: string, title: string | undefined, content: string) => {
      const mappedType = mapType(type);
      const trimmedContent = content
        .replace(/^(?:    |\t)/gm, "")
        .trim();
      const displayTitle = title || mappedType.charAt(0).toUpperCase() + mappedType.slice(1);
      return `<Collapsible title="${displayTitle}">\n\n<Admonition type="${mappedType}">\n${trimmedContent}\n</Admonition>\n\n</Collapsible>`;
    }
  );

  return result;
}
