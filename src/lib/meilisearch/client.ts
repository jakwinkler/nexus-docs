import { MeiliSearch } from "meilisearch";

const globalForMeili = globalThis as unknown as {
  meili: MeiliSearch | undefined;
};

if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.MEILISEARCH_KEY
) {
  throw new Error("MEILISEARCH_KEY environment variable is required in production");
}

export const searchClient =
  globalForMeili.meili ??
  new MeiliSearch({
    host: process.env.MEILISEARCH_URL || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_KEY || "",
  });

if (process.env.NODE_ENV !== "production") globalForMeili.meili = searchClient;

export const DOCS_INDEX = "docs";
