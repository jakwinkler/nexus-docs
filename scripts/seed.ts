import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Tiers ─────────────────────────────────────────
  // Default tier set. Keep public/client/partner/admin as the core 4;
  // gold_partner and platinum_partner are reference custom tiers to show
  // the extension pattern. Remove or rename as your model requires, then
  // update KNOWN_TIER_NAMES in src/lib/acl/index.ts to match.
  const tiers = [
    { name: "public",           label: "Public",           rank: 0,   visibility: "public" as const,    description: "Publicly visible to everyone" },
    { name: "client",           label: "Client",           rank: 10,  visibility: "protected" as const, description: "Authenticated users with extension grants" },
    { name: "partner",          label: "Partner",          rank: 20,  visibility: "protected" as const, description: "Trusted partners — bypass extension checks" },
    { name: "gold_partner",     label: "Gold Partner",     rank: 30,  visibility: "protected" as const, description: "Higher-tier partners (example custom tier)", color: "#f59e0b" },
    { name: "platinum_partner", label: "Platinum Partner", rank: 40,  visibility: "private" as const,   description: "Top-tier partners (example custom tier)",   color: "#a855f7" },
    { name: "admin",            label: "Admin",            rank: 100, visibility: "private" as const,   description: "Full system access" },
  ];

  for (const tier of tiers) {
    await prisma.tier.upsert({
      where: { name: tier.name },
      update: { label: tier.label, rank: tier.rank, visibility: tier.visibility, description: tier.description, color: tier.color },
      create: tier,
    });
  }
  console.log(`  Tiers: ${tiers.map((t) => `${t.label} (rank ${t.rank}, ${t.visibility})`).join(", ")}`);

  // ─── Users ─────────────────────────────────────────
  // Production: only seed an admin if SEED_ADMIN_EMAIL is set, and use
  // SEED_ADMIN_PASSWORD if provided (otherwise generate a random password
  // and print it once, so it can never be guessed from git history).
  // Development: seed full fixtures (admin, client, partner) with a
  // well-known password for local convenience.
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const seedEmail = process.env.SEED_ADMIN_EMAIL;
    if (!seedEmail) {
      console.log("  Skipping user seed (production, no SEED_ADMIN_EMAIL set).");
      console.log("Seed complete.");
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: seedEmail } });
    if (existing) {
      console.log(`  Admin already exists: ${existing.email}. Skipping (use admin UI to change password).`);
      console.log("Seed complete.");
      return;
    }

    const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(18).toString("base64url");
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email: seedEmail,
        name: process.env.SEED_ADMIN_NAME || "Admin",
        tier: "admin",
        passwordHash,
        emailVerified: new Date(),
      },
    });
    console.log(`  Admin created: ${admin.email}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`  Generated password (save this — shown only once): ${password}`);
    }
    console.log("Seed complete.");
    return;
  }

  // Development fixtures
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      tier: "admin",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  console.log(`  Admin: ${admin.email} (${admin.id})`);

  const client = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      name: "Client User",
      tier: "client",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  await prisma.userPermission.upsert({
    where: {
      userId_extension: {
        userId: client.id,
        extension: "example/sample-extension",
      },
    },
    update: {},
    create: {
      userId: client.id,
      extension: "example/sample-extension",
      grantedBy: admin.id,
    },
  });
  console.log(`  Client: ${client.email} (${client.id}) — example/sample-extension`);

  const partner = await prisma.user.upsert({
    where: { email: "partner@example.com" },
    update: {},
    create: {
      email: "partner@example.com",
      name: "Partner User",
      tier: "partner",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  console.log(`  Partner: ${partner.email} (${partner.id})`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
