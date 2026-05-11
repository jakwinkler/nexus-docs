import { codeToHtml } from "shiki";
import { CopyButton } from "./code-block-copy";

const LANGUAGE_LABELS: Record<string, string> = {
  js: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  tsx: "TSX",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  md: "Markdown",
  mdx: "MDX",
  bash: "Bash",
  sh: "Shell",
  zsh: "Shell",
  shell: "Shell",
  python: "Python",
  py: "Python",
  php: "PHP",
  ruby: "Ruby",
  rb: "Ruby",
  go: "Go",
  rust: "Rust",
  rs: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  kt: "Kotlin",
  swift: "Swift",
  sql: "SQL",
  graphql: "GraphQL",
  gql: "GraphQL",
  docker: "Dockerfile",
  dockerfile: "Dockerfile",
  nginx: "Nginx",
  toml: "TOML",
  ini: "INI",
  diff: "Diff",
  plaintext: "Text",
  text: "Text",
  txt: "Text",
};

interface MetaInfo {
  title?: string;
  highlightLines: Set<number>;
  showLineNumbers: boolean;
}

function parseMeta(meta?: string): MetaInfo {
  const result: MetaInfo = {
    highlightLines: new Set(),
    showLineNumbers: false,
  };

  if (!meta) return result;

  // Parse title="filename.ts"
  const titleMatch = meta.match(/title="([^"]+)"/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }

  // Parse line numbers flag
  if (meta.includes("showLineNumbers") || meta.includes("lineNumbers")) {
    result.showLineNumbers = true;
  }

  // Parse highlighted lines: {1,3-5,8}
  const lineMatch = meta.match(/\{([\d,\-\s]+)\}/);
  if (lineMatch) {
    const parts = lineMatch[1].split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(Number);
        for (let i = start; i <= end; i++) {
          result.highlightLines.add(i);
        }
      } else {
        result.highlightLines.add(Number(trimmed));
      }
    }
    // Auto-enable line numbers when highlighting lines
    result.showLineNumbers = true;
  }

  return result;
}

function extractTextContent(node: unknown): string {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";

  const element = node as { props?: { children?: unknown } };

  if (element.props) {
    const children = element.props.children;
    if (typeof children === "string") {
      return children;
    }
    if (Array.isArray(children)) {
      return children.map(extractTextContent).join("");
    }
    if (children) {
      return extractTextContent(children);
    }
  }
  return "";
}

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
}

export async function CodeBlock({ children, ...props }: CodeBlockProps) {
  // Extract the <code> element from within <pre>
  const codeElement = children as { props?: Record<string, unknown> };

  if (!codeElement?.props) {
    return (
      <pre
        className="overflow-x-auto rounded-lg bg-[var(--color-surface-invert)] p-4 text-sm"
        {...props}
      >
        {children}
      </pre>
    );
  }

  const className = (codeElement.props.className as string) || "";
  const langMatch = className.match(/language-(\w+)/);
  const language = langMatch ? langMatch[1] : "plaintext";
  const rawCode = extractTextContent(codeElement).replace(/\n$/, "");

  const meta = parseMeta(codeElement.props["data-meta"] as string);

  // Use Shiki for syntax highlighting
  let html: string;
  try {
    html = await codeToHtml(rawCode, {
      lang: language,
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
      transformers: [
        {
          line(node, line) {
            if (meta.highlightLines.has(line)) {
              this.addClassToHast(node, "highlighted-line");
            }
          },
        },
      ],
    });
  } catch {
    // Fallback if language is not supported
    html = await codeToHtml(rawCode, {
      lang: "plaintext",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    });
  }

  const languageLabel = LANGUAGE_LABELS[language] || language;
  const hasHeader = meta.title || language !== "plaintext";

  return (
    <div className="group relative my-4 not-prose">
      {/* Header bar with title and language */}
      {hasHeader && (
        <div className="flex items-center justify-between rounded-t-lg border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2">
          <span className="text-xs font-medium text-[var(--color-text-muted)] truncate">
            {meta.title || ""}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {languageLabel}
            </span>
            <CopyButton code={rawCode} />
          </div>
        </div>
      )}

      {/* Code content */}
      <div
        className={`overflow-x-auto rounded-lg border border-[var(--color-border)] text-sm ${
          hasHeader ? "rounded-t-none border-t-0" : ""
        } ${meta.showLineNumbers ? "show-line-numbers" : ""} [&_pre]:p-4 [&_pre]:m-0 [&_.highlighted-line]:bg-brand-50 [&_.highlighted-line]:dark:bg-brand-950/30 [&_.highlighted-line]:border-l-2 [&_.highlighted-line]:border-brand-400 [&_.line]:px-4 [&_.line]:-mx-4 [&_.highlighted-line]:pl-[14px]`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Copy button fallback when no header */}
      {!hasHeader && (
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton code={rawCode} />
        </div>
      )}
    </div>
  );
}
