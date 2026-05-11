import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logAudit(
  event: string,
  userId: string | null,
  data: Record<string, unknown>,
  ip?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      event,
      userId,
      data: data as Prisma.InputJsonValue,
      ip,
    },
  });
}
