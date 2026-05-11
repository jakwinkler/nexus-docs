import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the queue producer
vi.mock("@/lib/queue/producers", () => ({
  enqueueEmail: vi.fn(),
}));

describe("sendEmailDirect", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("logs to console when no transport is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("SMTP_HOST", "");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendEmailDirect } = await import("../send");

    const result = await sendEmailDirect({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("EMAIL")
    );

    consoleSpy.mockRestore();
  });
});

describe("sendEmail (queued)", () => {
  it("enqueues email for background sending", async () => {
    const { sendEmail } = await import("../send");
    const { enqueueEmail } = await import("@/lib/queue/producers");

    await sendEmail("test@example.com", "invite", { name: "Test" });

    expect(enqueueEmail).toHaveBeenCalledWith(
      "test@example.com",
      "invite",
      { name: "Test" }
    );
  });
});
