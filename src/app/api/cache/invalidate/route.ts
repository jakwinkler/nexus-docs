import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { invalidateCache } from "@/lib/content";

export async function POST(request: NextRequest) {
  // Verify the request comes from our worker using the webhook secret
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const token = request.headers.get("authorization")?.replace("Bearer ", "") || "";
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(secret);

  if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  invalidateCache();

  return NextResponse.json({ invalidated: true, timestamp: new Date().toISOString() });
}
