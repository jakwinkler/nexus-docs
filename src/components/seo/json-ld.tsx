interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    ...data,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

// ─── Organization Schema (homepage) ──────────────────

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@type": "Organization",
        name: "nexus",
        url: "https://example.com",
        logo: "https://docs.example.com/images/nexus-logo.svg",
        sameAs: [
          "https://github.com/nexus",
          "https://gitlab.com/nexus",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "technical support",
          url: "https://example.com/contact",
        },
      }}
    />
  );
}

// ─── WebSite Schema (for sitelinks searchbox) ────────

export function WebSiteJsonLd({
  siteUrl,
  siteName,
}: {
  siteUrl: string;
  siteName: string;
}) {
  return (
    <JsonLd
      data={{
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

// ─── Doc Page Schemas ────────────────────────────────

interface DocPageJsonLdProps {
  title: string;
  summary: string;
  url: string;
  dateModified: string;
  datePublished?: string;
  product?: string;
  breadcrumbs?: { name: string; url: string }[];
  tags?: string[];
  owner?: string;
}

export function DocPageJsonLd({
  title,
  summary,
  url,
  dateModified,
  datePublished,
  product,
  breadcrumbs,
  tags,
  owner,
}: DocPageJsonLdProps) {
  return (
    <>
      {/* TechArticle schema — better than Article for technical docs */}
      <JsonLd
        data={{
          "@type": "TechArticle",
          headline: title,
          description: summary,
          url,
          dateModified,
          datePublished: datePublished || dateModified,
          author: {
            "@type": "Person",
            name: owner || "nexus",
          },
          publisher: {
            "@type": "Organization",
            name: "nexus",
            logo: {
              "@type": "ImageObject",
              url: "https://docs.example.com/images/nexus-logo.svg",
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": url,
          },
          ...(product && {
            about: {
              "@type": "SoftwareApplication",
              name: product,
              applicationCategory: "Magento 2 Extension",
              operatingSystem: "Magento 2",
              offers: {
                "@type": "Offer",
                category: "Extension",
              },
            },
          }),
          ...(tags &&
            tags.length > 0 && {
              keywords: tags.join(", "),
            }),
          inLanguage: "en",
          isAccessibleForFree: true,
        }}
      />

      {/* BreadcrumbList schema */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <JsonLd
          data={{
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((crumb, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: crumb.name,
              item: crumb.url,
            })),
          }}
        />
      )}
    </>
  );
}

// ─── Software Application Schema ────────────────────

export function SoftwareJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        "@type": "SoftwareApplication",
        name,
        description,
        url,
        applicationCategory: "Magento 2 Extension",
        operatingSystem: "Magento 2.4+",
        offers: {
          "@type": "Offer",
          category: "Extension",
        },
        author: {
          "@type": "Organization",
          name: "nexus",
        },
      }}
    />
  );
}

// ─── FAQ Schema ──────────────────────────────────────

export function FAQJsonLd({
  questions,
}: {
  questions: { question: string; answer: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@type": "FAQPage",
        mainEntity: questions.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      }}
    />
  );
}
