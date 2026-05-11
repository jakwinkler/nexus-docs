import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { IdeaForm } from "./idea-form";

export const metadata: Metadata = {
  title: "Submit an Idea",
  description: "Share feature ideas and improvements you'd like to see.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const session = await auth();

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/ideas")}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Submit an Idea</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        Tell us what you&apos;d like to see next. We read everything.
      </p>

      <div className="mt-8">
        <IdeaForm />
      </div>

      <p className="mt-12 text-sm text-[var(--color-text-muted)]">
        Found a documentation issue instead?{" "}
        <Link href="/docs" className="text-brand-600 hover:underline">
          Use the &ldquo;Report&rdquo; button on the page.
        </Link>
      </p>
    </div>
  );
}
