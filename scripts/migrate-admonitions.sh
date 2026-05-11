#!/usr/bin/env bash
set -euo pipefail

CONTENT_DIR="${1:-content}"

echo "=== MkDocs Admonition Migration ==="
echo "Content directory: $CONTENT_DIR"

# Check for python3
if ! command -v python3 &> /dev/null; then
  echo "ERROR: python3 is required for admonition conversion"
  exit 1
fi

CONVERTED=0

find "$CONTENT_DIR" -name "*.md" -o -name "*.mdx" | sort | while read -r file; do
  # Check if file contains MkDocs admonitions
  if ! grep -q "^!!! " "$file"; then
    continue
  fi

  python3 -c "
import re
import sys

with open('$file', 'r') as f:
    content = f.read()

type_map = {
    'note': 'info', 'abstract': 'info', 'info': 'info',
    'tip': 'tip', 'success': 'tip', 'question': 'info',
    'warning': 'warning', 'failure': 'danger', 'danger': 'danger',
    'bug': 'danger', 'example': 'info', 'quote': 'info'
}

def convert_admonition(match):
    adm_type = match.group(1)
    title = match.group(2) or ''
    body = match.group(3)
    nexus_type = type_map.get(adm_type, 'info')
    body = re.sub(r'^    ', '', body, flags=re.MULTILINE).strip()
    if title:
        return f'<Admonition type=\"{nexus_type}\" title=\"{title}\">\n{body}\n</Admonition>'
    return f'<Admonition type=\"{nexus_type}\">\n{body}\n</Admonition>'

pattern = r'!!! (\w+)(?: \"([^\"]+)\")?\n((?:    .+\n?)+)'
new_content = re.sub(pattern, convert_admonition, content)

if new_content != content:
    with open('$file', 'w') as f:
        f.write(new_content)
    print(f'  CONVERTED: $file')
else:
    print(f'  NO CHANGE: $file')
" 2>/dev/null

  CONVERTED=$((CONVERTED + 1))
done

echo ""
echo "Done. Processed $CONVERTED files with admonitions."
