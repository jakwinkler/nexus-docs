import { describe, it, expect, vi, beforeEach } from "vitest";

vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://docs.example.com");
vi.stubEnv("NEXT_PUBLIC_SITE_NAME", "Test Docs");

import { invitationEmail, accessApprovedEmail, accessDeniedEmail } from "../templates";

describe("invitationEmail", () => {
  it("generates subject and html", () => {
    const result = invitationEmail({
      acceptUrl: "https://docs.example.com/auth/accept-invite?token=abc123",
      extensions: ["nexus/gdpr-suite", "nexus/seo-rich-snippets"],
      tier: "partner",
      expiresAt: new Date("2026-04-30"),
    });

    expect(result.subject).toContain("invited");
    expect(result.html).toContain("accept-invite?token=abc123");
    expect(result.html).toContain("Partner");
    expect(result.html).toContain("Gdpr Suite");
    expect(result.html).toContain("Seo Rich Snippets");
  });

  it("includes custom message when provided", () => {
    const result = invitationEmail({
      acceptUrl: "https://example.com/invite",
      extensions: [],
      tier: "client",
      message: "Welcome aboard!",
      expiresAt: new Date("2026-05-01"),
    });

    expect(result.html).toContain("Welcome aboard!");
  });

  it("handles empty extensions list", () => {
    const result = invitationEmail({
      acceptUrl: "https://example.com/invite",
      extensions: [],
      tier: "gold_partner",
      expiresAt: new Date("2026-06-01"),
    });

    expect(result.html).toContain("Gold Partner");
    expect(result.html).not.toContain("<ul>");
  });

  it("formats tier name with underscores correctly", () => {
    const result = invitationEmail({
      acceptUrl: "https://example.com/invite",
      extensions: [],
      tier: "platinum_partner",
      expiresAt: new Date("2026-06-01"),
    });

    expect(result.html).toContain("Platinum Partner");
  });

  it("includes expiry date", () => {
    const result = invitationEmail({
      acceptUrl: "https://example.com/invite",
      extensions: [],
      tier: "client",
      expiresAt: new Date("2026-12-25"),
    });

    expect(result.html).toContain("25");
    expect(result.html).toContain("December");
    expect(result.html).toContain("2026");
  });
});

describe("accessApprovedEmail", () => {
  it("generates approved email with tier", () => {
    const result = accessApprovedEmail({ tier: "partner" });

    expect(result.subject).toContain("Access granted");
    expect(result.html).toContain("Partner");
    expect(result.html).toContain("approved");
  });

  it("includes page link when provided", () => {
    const result = accessApprovedEmail({
      tier: "client",
      pagePath: "/docs/extensions/gdpr-suite",
    });

    expect(result.html).toContain("/docs/extensions/gdpr-suite");
  });
});

describe("accessDeniedEmail", () => {
  it("generates denied email", () => {
    const result = accessDeniedEmail({});

    expect(result.subject).toContain("update");
    expect(result.html).toContain("not approved");
  });

  it("includes reason when provided", () => {
    const result = accessDeniedEmail({
      reason: "Please purchase the extension first.",
    });

    expect(result.html).toContain("Please purchase the extension first.");
  });
});
