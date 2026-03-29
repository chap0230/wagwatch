#!/usr/bin/env bash
set -euo pipefail

# Senior Dog Health Tracker — Automated Deploy Script
# Usage: ./deploy.sh [--region us-west-2]

REGION="${AWS_DEFAULT_REGION:-us-west-2}"
while [[ $# -gt 0 ]]; do
  case $1 in
    --region) REGION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
export CDK_DEFAULT_REGION="$REGION"

echo "🐾 Wag Watch — Deploy"
echo "   Region: $REGION"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required. Install from https://aws.amazon.com/cli/"; exit 1; }

# Verify AWS credentials
echo "🔑 Verifying AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) || {
  echo "❌ AWS credentials not configured. Run 'aws configure' first."
  exit 1
}
export CDK_DEFAULT_ACCOUNT="$ACCOUNT_ID"
echo "   Account: $ACCOUNT_ID"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd "$ROOT_DIR/backend" && npm install --silent
cd "$ROOT_DIR/frontend" && npm install --silent
cd "$ROOT_DIR/cdk" && npm install --silent

# Build backend
echo ""
echo "🔨 Building backend..."
cd "$ROOT_DIR/backend" && npm run build

# Bootstrap CDK (idempotent)
echo ""
echo "☁️  Bootstrapping CDK..."
cd "$ROOT_DIR/cdk" && npx cdk bootstrap "aws://$ACCOUNT_ID/$REGION" 2>&1 | grep -E "(✅|already)" || true

# Deploy infrastructure stacks (without frontend content)
echo ""
echo "🚀 Deploying infrastructure..."
cd "$ROOT_DIR/cdk"
npx cdk deploy DogTrackerDatabase DogTrackerAuth DogTrackerStorage DogTrackerApi DogTrackerFrontend \
  --require-approval never \
  --outputs-file "$ROOT_DIR/cdk-outputs.json" 2>&1 | grep -E "(✅|FAILED|error)" || true

# Check for deployment failure
if [ ! -f "$ROOT_DIR/cdk-outputs.json" ]; then
  echo "❌ Deployment failed. Check the output above for errors."
  exit 1
fi

# Extract outputs and generate frontend .env
echo ""
echo "⚙️  Configuring frontend..."
python3 - "$ROOT_DIR/cdk-outputs.json" "$ROOT_DIR/frontend/.env" << 'PYEOF'
import json, sys
with open(sys.argv[1]) as f:
    outputs = json.load(f)

auth = outputs.get("DogTrackerAuth", {})
api = outputs.get("DogTrackerApi", {})
frontend = outputs.get("DogTrackerFrontend", {})

user_pool_id = auth.get("UserPoolId", "")
client_id = auth.get("UserPoolClientId", "")
cognito_domain = auth.get("CognitoDomain", "")
api_url = api.get("ApiUrl", "").rstrip("/")

env_content = f"""VITE_USER_POOL_ID={user_pool_id}
VITE_USER_POOL_CLIENT_ID={client_id}
VITE_COGNITO_DOMAIN={cognito_domain}
VITE_API_URL={api_url}
"""

with open(sys.argv[2], "w") as f:
    f.write(env_content)

print(f"   User Pool ID:  {user_pool_id}")
print(f"   Client ID:     {client_id}")
print(f"   Cognito Domain:{cognito_domain}")
print(f"   API URL:       {api_url}")
PYEOF

# Build frontend with real config
echo ""
echo "🔨 Building frontend..."
cd "$ROOT_DIR/frontend" && npm run build

# Redeploy frontend with built assets
echo ""
echo "🚀 Deploying frontend assets..."
cd "$ROOT_DIR/cdk"
npx cdk deploy DogTrackerFrontend --require-approval never 2>&1 | grep -E "(✅|FAILED)" || true

# Extract final URL
SITE_URL=$(python3 -c "import json; print(json.load(open('$ROOT_DIR/cdk-outputs.json')).get('DogTrackerFrontend',{}).get('DistributionUrl',''))" 2>/dev/null)

echo ""
echo "════════════════════════════════════════════"
echo "  🐾 Deployment Complete!"
echo ""
echo "  App URL: $SITE_URL"
echo "  Region:  $REGION"
echo "  Account: $ACCOUNT_ID"
echo ""
echo "  Next steps:"
echo "  1. Open $SITE_URL on your phone"
echo "  2. Create an account and set up your household"
echo "  3. Add your dog and start tracking!"
echo ""
echo "  Optional: Enable Bedrock Claude model access"
echo "  in the AWS Console for AI chat features."
echo "════════════════════════════════════════════"
