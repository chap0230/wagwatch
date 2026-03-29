#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🐾 Wag Watch — Destroy"
echo ""
echo "⚠️  This will delete ALL deployed resources."
echo "   DynamoDB tables and photo bucket are RETAINED and must be deleted manually."
echo ""
read -p "Are you sure? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

cd "$ROOT_DIR/cdk"
npx cdk destroy --all --force

echo ""
echo "✅ Stacks destroyed."
echo ""
echo "Manually delete retained resources in the AWS Console:"
echo "  - DynamoDB tables (dog-tracker-*)"
echo "  - S3 photos bucket"
