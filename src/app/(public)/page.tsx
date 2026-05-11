import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Shield, Zap, Code } from "lucide-react";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "nexus Docs — Magento 2 Extension Documentation",
  description:
    "Official documentation for nexus Magento 2 extensions. Find installation guides, configuration help, usage instructions, and developer resources.",
  alternates: {
    canonical: "/",
  },
};

const features = [
  {
    icon: BookOpen,
    title: "Extension Docs",
    description:
      "Detailed guides for every nexus extension — installation, configuration, and usage.",
    href: "/docs/extensions",
  },
  {
    icon: Shield,
    title: "Speed Suite",
    description:
      "Optimized Indexes, STOP Protocol, and Preloaders — dramatically faster Magento 2.",
    href: "/docs/extensions/speed",
  },
  {
    icon: Zap,
    title: "Trident Velocity Engine",
    description:
      "High-performance HTTP caching and reverse proxy built in Rust. Sub-millisecond response times.",
    href: "/docs/trident",
  },
  {
    icon: Code,
    title: "Open Source",
    description:
      "Free PHP libraries, developer tools, and Magento 2 modules.",
    href: "/docs/open-source",
  },
];

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL || "https://docs.example.com"}
        siteName="nexus Docs"
      />

      {/* Hero */}
      <section className="border-b border-[var(--color-border)] bg-gradient-to-b from-brand-50/50 to-[var(--color-surface)] dark:from-brand-950/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            nexus{" "}
            <span className="text-brand-600">Documentation</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Everything you need to install, configure, and get the most out of
            nexus Magento 2 extensions.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Browse Docs
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-6 py-3 text-sm font-medium hover:bg-[var(--color-surface-secondary)] transition-colors"
            >
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group rounded-xl border border-[var(--color-border)] p-6 hover:border-brand-400 hover:shadow-sm transition-all"
            >
              <feature.icon className="h-8 w-8 text-brand-600" />
              <h2 className="mt-4 text-lg font-semibold group-hover:text-brand-600 transition-colors">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
