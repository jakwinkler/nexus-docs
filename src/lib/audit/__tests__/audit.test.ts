import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module under test
vi.mock("@/lib/db", () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "mock-id" }),
    },
  },
}));

import { logAudit } from "../index";
import { prisma } from "@/lib/db";

const mockCreate = prisma.auditLog.create as ReturnType<typeof vi.fn>;

describe("logAudit", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  it("creates an audit log entry with all fields", async () => {
    await logAudit("user.login", "user-123", { browser: "Chrome" }, "192.168.1.1");

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        event: "user.login",
        userId: "user-123",
        data: { browser: "Chrome" },
        ip: "192.168.1.1",
      },
    });
  });

  it("handles null userId", async () => {
    await logAudit("page.view", null, { path: "/docs/test" });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        event: "page.view",
        userId: null,
        data: { path: "/docs/test" },
        ip: undefined,
      },
    });
  });

  it("handles undefined ip (optional parameter)", async () => {
    await logAudit("doc.access", "user-456", { slug: "test" });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        event: "doc.access",
        userId: "user-456",
        data: { slug: "test" },
        ip: undefined,
      },
    });
  });

  it("handles complex nested data objects", async () => {
    const complexData = {
      action: "approve",
      request: { id: "req-1", tier: "partner" },
      changes: ["tier_upgrade", "permission_grant"],
    };

    await logAudit("access.approve", "admin-1", complexData, "10.0.0.1");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        event: "access.approve",
        userId: "admin-1",
        data: complexData,
        ip: "10.0.0.1",
      },
    });
  });

  it("handles empty data object", async () => {
    await logAudit("system.start", null, {});

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        event: "system.start",
        userId: null,
        data: {},
        ip: undefined,
      },
    });
  });

  it("propagates prisma errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB connection failed"));

    await expect(
      logAudit("test.event", "user-1", { test: true })
    ).rejects.toThrow("DB connection failed");
  });

  it("returns void on success", async () => {
    const result = await logAudit("test.event", "user-1", {});
    expect(result).toBeUndefined();
  });
});
