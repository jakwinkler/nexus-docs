import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllDocs } from "@/lib/content";

// GET /api/admin/extensions — returns all unique product names from content
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const docs = await getAllDocs();

  // Collect unique product names (excluding "platform" and category index pages)
  const products = new Set<string>();
  for (const doc of docs) {
    if (doc.product && doc.product !== "platform") {
      products.add(doc.product);
    }
  }

  const extensions = Array.from(products).sort();

  return NextResponse.json({ extensions });
}
