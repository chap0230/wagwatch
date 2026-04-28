#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🐾 Wag Watch — Destroy"
echo ""
echo "⚠️  This will delete the deployed CloudFormation stacks."
echo ""
echo "   DynamoDB tables and the dog-photos S3 bucket have RemovalPolicy=RETAIN —"
echo "   they will NOT be deleted automatically. To fully clean up, remove them"
echo "   manually from the AWS Console after this script finishes."
echo ""
read -p "Are you sure? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

(cd "$ROOT_DIR/cdk" && npx cdk destroy --all --force)

# Remove generated config so the next deploy starts clean.
rm -f "$ROOT_DIR/cdk-outputs.json" "$ROOT_DIR/frontend/.env"

echo ""
echo "✅ Stacks destroyed."
echo ""
echo "Manually delete these retained resources in the AWS Console if you want them gone:"
echo "  - DynamoDB tables prefixed 'dog-tracker-'"
echo "  - S3 bucket prefixed 'dogtrackerstorage-photosbucket'"
