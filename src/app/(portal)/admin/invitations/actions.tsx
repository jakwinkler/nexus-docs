"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    if (!confirm("Revoke this invitation? The accept link will stop working.")) {
      return;
    }
    setLoading(true);
    await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={loading}
      className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900 dark:text-red-300"
    >
      {loading ? "…" : "Revoke"}
    </button>
  );
}
