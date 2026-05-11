#!/usr/bin/env bash
set -euo pipefail

CONTENT_DIR="${1:-content}"

echo "=== MkDocs Frontmatter Migration ==="
echo "Content directory: $CONTENT_DIR"

ADDED=0
SKIPPED=0

find "$CONTENT_DIR" -name "*.md" -o -name "*.mdx" | sort | while read -r file; do
  # Skip files that already have frontmatter
  if head -1 "$file" | grep -q "^---"; then
    echo "  SKIP: $file"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Extract title from first H1 heading
  TITLE=$(grep -m1 "^# " "$file" | sed 's/^# //' || echo "")
  if [ -z "$TITLE" ]; then
    TITLE=$(basename "$file" .md | sed 's/-/ /g')
  fi

  # Determine product from path
  PRODUCT="platform"
  case "$file" in
    *gdpr*) PRODUCT="gdpr-suite" ;;
    *seo*) PRODUCT="seo-rich-snippets" ;;
    *omnibus*) PRODUCT="omnibus-directive" ;;
  esac

  # Prepend frontmatter
  TMPFILE=$(mktemp)
  cat > "$TMPFILE" << EOF
---
title: "$TITLE"
summary: ""
access_tier: public
product: $PRODUCT
status: published
owner: jakub
nav_order: 0
---

EOF
  cat "$file" >> "$TMPFILE"
  mv "$TMPFILE" "$file"
  echo "  ADDED: $file"
  ADDED=$((ADDED + 1))
done

echo ""
echo "Done. Added frontmatter to $ADDED files."
