import { searchClient, DOCS_INDEX } from "./client";

export const INDEX_SETTINGS = {
  filterableAttributes: [
    "access_tier",
    "extensions",
    "product",
    "version",
    "status",
    "tags",
  ],
  sortableAttributes: ["title", "nav_order", "last_verified_at"],
  searchableAttributes: ["title", "summary", "content", "tags"],
};

export async function configureIndex(): Promise<void> {
  const index = searchClient.index(DOCS_INDEX);

  await index.updateFilterableAttributes(INDEX_SETTINGS.filterableAttributes);
  await index.updateSortableAttributes(INDEX_SETTINGS.sortableAttributes);
  await index.updateSearchableAttributes(INDEX_SETTINGS.searchableAttributes);

  console.log(`Meilisearch index "${DOCS_INDEX}" configured.`);
}
