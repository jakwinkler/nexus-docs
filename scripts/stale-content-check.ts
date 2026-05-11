import { PrismaClient } from "@prisma/client";
import { getAllDocs } from "../src/lib/content";
import { sendEmailDirect } from "../src/lib/email/send";
import { staleContentDigestEmail } from "../src/lib/email/templates";

const prisma = new PrismaClient();

interface StaleDoc {
  slug: string;
  title: string;
  lastVerified?: string;
  daysSince: number;
}

async function main() {
  console.log("Scanning content for stale pages…");
  const docs = await getAllDocs();
  const now = Date.now();

  const stale: StaleDoc[] = [];
  for (const doc of docs) {
    if (doc.status === "draft" || doc.status === "deprecated") continue;
    const intervalDays = doc.review_interval_days ?? 90;

    let daysSince = Infinity;
    if (doc.last_verified_at) {
      const lastDate = new Date(doc.last_verified_at).getTime();
      if (!Number.isNaN(lastDate)) {
        daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      }
    }

    if (daysSince > intervalDays) {
      stale.push({
        slug: doc.slug,
        title: doc.title,
        lastVerified: doc.last_verified_at,
        daysSince: Number.isFinite(daysSince) ? daysSince : -1,
      });
    }
  }

  console.log(`Found ${stale.length} stale page(s).`);

  if (stale.length === 0) {
    console.log("Nothing to send.");
    return;
  }

  const admins = await prisma.user.findMany({
    where: { tier: "admin" },
    select: { email: true, name: true },
  });

  if (admins.length === 0) {
    console.log("No admins to notify.");
    return;
  }

  // Sort newest-stale first so the list is most-actionable at the top.
  stale.sort((a, b) => b.daysSince - a.daysSince);

  for (const admin of admins) {
    const { subject, html } = staleContentDigestEmail({
      ownerName: admin.name || "there",
      staleDocs: stale,
    });
    const ok = await sendEmailDirect({ to: admin.email, subject, html });
    console.log(`  ${ok ? "✓" : "✗"} ${admin.email}`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Stale content check failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
