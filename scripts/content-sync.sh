#!/usr/bin/env bash
set -euo pipefail

CONTENT_DIR="${CONTENT_DIR:-./content}"
GITLAB_URL="${GITLAB_URL:-}"
GITLAB_TOKEN="${GITLAB_TOKEN:-}"
GITLAB_PROJECT_ID="${GITLAB_CONTENT_PROJECT_ID:-}"
GITLAB_BRANCH="${GITLAB_CONTENT_BRANCH:-main}"

echo "=== Content Sync ==="

if [ -n "$GITLAB_URL" ] && [ -n "$GITLAB_TOKEN" ] && [ -n "$GITLAB_PROJECT_ID" ]; then
  echo "Syncing from GitLab..."

  if [ -d "$CONTENT_DIR/.git" ]; then
    echo "Pulling latest changes..."
    cd "$CONTENT_DIR"
    git fetch origin "$GITLAB_BRANCH"
    git reset --hard "origin/$GITLAB_BRANCH"
    cd -
  else
    echo "Cloning content repository..."
    REPO_URL=$(echo "$GITLAB_URL" | sed 's|https://|https://oauth2:'"$GITLAB_TOKEN"'@|')
    git clone --single-branch --branch "$GITLAB_BRANCH" \
      "${REPO_URL}/api/v4/projects/${GITLAB_PROJECT_ID}/repository/archive.tar.gz" \
      "$CONTENT_DIR" 2>/dev/null || {
        echo "Falling back to API archive download..."
        mkdir -p "$CONTENT_DIR"
        curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
          "$GITLAB_URL/api/v4/projects/$GITLAB_PROJECT_ID/repository/archive?sha=$GITLAB_BRANCH" \
          | tar xz --strip-components=1 -C "$CONTENT_DIR"
      }
  fi

  echo "Content synced from GitLab."
else
  echo "GitLab not configured. Using local content directory: $CONTENT_DIR"

  if [ ! -d "$CONTENT_DIR" ]; then
    echo "WARNING: Content directory does not exist: $CONTENT_DIR"
    exit 1
  fi

  FILE_COUNT=$(find "$CONTENT_DIR" -name "*.md" -o -name "*.mdx" | wc -l | tr -d ' ')
  echo "Found $FILE_COUNT markdown files."
fi

echo "=== Content Sync complete ==="
