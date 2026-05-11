import Link from "next/link";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Nexus Docs";

const footerLinks = {
  Docs: [
    { label: "Browse", href: "/docs" },
    { label: "Tags", href: "/docs/tags" },
    { label: "Search", href: "/search" },
  ],
  Community: [
    { label: "Submit an Idea", href: "/ideas" },
    {
      label: "GitHub",
      href: "https://github.com/jakwinkler/nexus-docs",
    },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          <div>
            <span className="text-lg font-bold text-brand-600">{siteName}</span>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Self-hostable documentation portal with tier-based access control.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {title}
              </h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-[var(--color-border)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[var(--color-text-muted)]">
          <span>
            &copy; {new Date().getFullYear()} {siteName}.
          </span>
          <span>
            Open source under the{" "}
            <Link
              href="https://github.com/jakwinkler/nexus-docs/blob/master/LICENSE"
              className="hover:text-[var(--color-text-secondary)]"
            >
              MIT license
            </Link>
            .
          </span>
        </div>
      </div>
    </footer>
  );
}
