import { configureIndex } from "../src/lib/meilisearch/index-config";
import { indexAllDocs } from "../src/lib/meilisearch/indexer";
import { invalidateCache } from "../src/lib/content";

async function main() {
  console.log("Configuring Meilisearch index...");
  await configureIndex();

  console.log("Indexing all documents...");
  invalidateCache();
  const count = await indexAllDocs();

  console.log(`Reindex complete: ${count} documents indexed.`);
}

main().catch((err) => {
  console.error("Reindex failed:", err);
  process.exit(1);
});
