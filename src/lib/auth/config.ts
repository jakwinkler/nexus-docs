import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitLab from "next-auth/providers/gitlab";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import "@/lib/auth/types";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    // GitLab OAuth (self-hosted or gitlab.com).
    // Note: Auth.js v5's GitLab provider uses `baseUrl` (not `issuer`) to
    // override the URL — `issuer` is silently ignored. baseUrl must end
    // with a trailing slash (the provider concatenates oauth/authorize etc).
    ...(process.env.GITLAB_CLIENT_ID
      ? [
          GitLab({
            clientId: process.env.GITLAB_CLIENT_ID,
            clientSecret: process.env.GITLAB_CLIENT_SECRET!,
            baseUrl: (process.env.GITLAB_URL || "https://gitlab.com").replace(/\/?$/, "/"),
          }),
        ]
      : []),

    // Credentials (dev / fallback)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Dynamic import keeps ioredis out of the Edge-runtime middleware bundle.
        // authorize() only runs in the Node runtime (API route), so this is safe.
        const { rateLimit, getClientIp } = await import("@/lib/rate-limit");

        // Rate-limit by both IP and email so a single attacker can't brute-force
        // an account from many IPs OR pound on many accounts from one IP.
        const email = credentials.email as string;
        const ip = request ? getClientIp(request as unknown as Request) : "unknown";
        const ipResult = await rateLimit(`signin-ip:${ip}`, 10, 300);
        const emailResult = await rateLimit(`signin-email:${email}`, 5, 300);
        if (!ipResult.ok || !emailResult.ok) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            tier: true,
            passwordHash: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          tier: user.tier,
        };
      },
    }),
  ],
  events: {
    // First-time sign-in via GitLab → grant the configured default tier.
    // Only fires when the PrismaAdapter creates a new user (not on every
    // sign-in), so admins can later demote a user to a lower tier without
    // having it auto-restored on their next login.
    async createUser({ user }) {
      const defaultTier = process.env.GITLAB_DEFAULT_TIER;
      if (
        defaultTier &&
        defaultTier !== "public" &&
        user.id
      ) {
        await prisma.user.update({
          where: { id: user.id },
          data: { tier: defaultTier },
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id!;

        // For OAuth users, look up tier from DB (new users default to "public")
        if (account?.provider === "gitlab") {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id! },
            select: { tier: true },
          });
          token.tier = dbUser?.tier || "public";
        } else {
          token.tier = (user as { tier: string }).tier;
        }
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          tier: token.tier as string,
        },
      };
    },
  },
};
