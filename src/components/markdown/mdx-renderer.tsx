import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { preprocessAdmonitions } from "@/lib/remark-admonitions";
import { Admonition } from "./admonition";
import { CodeBlock } from "./code-block";
import { CodeTabs } from "./code-tabs";
import { Collapsible } from "./collapsible";
import { ProtectedSection } from "./protected-section";
import { ExtensionGrid } from "./extension-grid";
import { VideoEmbed } from "../video/video-embed";
import { getTierRank } from "@/lib/acl";

interface MdxRendererProps {
  source: string;
  userTierRank?: number;
}

function makeProtectedComponent(userTierRank: number) {
  return function Protected({
    tier,
    label,
    children,
  }: {
    tier: string;
    label?: string;
    children: React.ReactNode;
  }) {
    const requiredRank = getTierRank(tier);
    const allowed = userTierRank >= requiredRank;
    return (
      <ProtectedSection tier={tier} tierLabel={label} allowed={allowed}>
        {children}
      </ProtectedSection>
    );
  };
}

export function MdxRenderer({ source, userTierRank = 0 }: MdxRendererProps) {
  const processedSource = preprocessAdmonitions(source);

  const components = {
    Admonition,
    VideoEmbed,
    CodeTabs,
    Collapsible,
    ExtensionGrid,
    Protected: makeProtectedComponent(userTierRank),
    pre: CodeBlock,
  };

  return (
    <MDXRemote
      source={processedSource}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              {
                behavior: "wrap",
                properties: {
                  className: ["anchor"],
                },
              },
            ],
          ],
        },
      }}
    />
  );
}
