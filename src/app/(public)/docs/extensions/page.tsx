import type { Metadata } from "next";
import { CategoryCards } from "@/components/docs/category-cards";
import { JsonLd } from "@/components/seo/json-ld";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com";

export const metadata: Metadata = {
  title: "Pro Extensions",
  description:
    "nexus Magento 2 pro extensions — SEO, compliance, catalog, media, search, and checkout. Browse all extensions by category.",
  alternates: {
    canonical: `${siteUrl}/docs/extensions`,
  },
};

export default function ExtensionsPage() {
  return (
    <>
      <JsonLd
        data={{
          "@type": "CollectionPage",
          name: "nexus Pro Extensions",
          description:
            "Magento 2 extensions for SEO, EU compliance, and store optimisation.",
          url: `${siteUrl}/docs/extensions`,
        }}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pro Extensions
          </h1>
          <p className="mt-3 text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Magento 2 extensions built for SEO, EU regulatory compliance, and
            store optimisation. Browse by category.
          </p>
        </div>

        <CategoryCards />
      </div>
    </>
  );
}
