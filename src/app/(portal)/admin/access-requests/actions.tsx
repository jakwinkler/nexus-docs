"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccessRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "approve" | "deny") {
    setLoading(true);
    await fetch(`/api/access/${requestId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => handleAction("deny")}
        disabled={loading}
        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
      >
        Deny
      </button>
    </div>
  );
}
