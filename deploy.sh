#!/usr/bin/env bash
set -euo pipefail

# Wag Watch — Automated Deploy Script
# Usage: ./deploy.sh [--region us-west-2]

REGION="${AWS_DEFAULT_REGION:-us-west-2}"
while [[ $# -gt 0 ]]; do
  case $1 in
    --region) REGION="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--region <aws-region>]"
      echo "Defaults: region=us-west-2 (or \$AWS_DEFAULT_REGION if set)"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
export CDK_DEFAULT_REGION="$REGION"

echo "🐾 Wag Watch — Deploy"
echo "   Region: $REGION"
echo ""

# --- Prerequisites ---
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 20+ is required. Install from https://nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ npm is required. It ships with Node.js."; exit 1; }
command -v aws  >/dev/null 2>&1 || { echo "❌ AWS CLI is required. Install from https://aws.amazon.com/cli/"; exit 1; }

NODE_MAJOR=$(node --version | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js $NODE_MAJOR is too old. Install Node.js 20 or newer."
  exit 1
fi

# --- AWS credentials ---
echo "🔑 Verifying AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) || {
  echo "❌ AWS credentials not configured. Run 'aws configure' first."
  exit 1
}
export CDK_DEFAULT_ACCOUNT="$ACCOUNT_ID"
echo "   Account: $ACCOUNT_ID"

# --- Bedrock model access check (non-fatal warning) ---
echo "🤖 Checking Bedrock Claude access in $REGION..."
if ! aws bedrock list-foundation-models --region "$REGION" --by-provider anthropic \
     --query "modelSummaries[?contains(modelId, 'claude-haiku-4-5')].modelId" --output text 2>/dev/null | grep -q claude; then
  echo "   ⚠️  Claude Haiku 4.5 does not appear to be available or enabled in $REGION."
  echo "   The app deploys fine, but the AI chat feature will fail until you enable it at:"
  echo "   https://$REGION.console.aws.amazon.com/bedrock/home?region=$REGION#/modelaccess"
fi

# --- Install ---
echo ""
echo "📦 Installing dependencies..."
(cd "$ROOT_DIR/backend"  && npm install --silent)
(cd "$ROOT_DIR/frontend" && npm install --silent)
(cd "$ROOT_DIR/cdk"      && npm install --silent)

# --- Build backend ---
echo ""
echo "🔨 Building backend..."
(cd "$ROOT_DIR/backend" && npm run build)

# --- Bootstrap CDK (idempotent) ---
echo ""
echo "☁️  Bootstrapping CDK..."
(cd "$ROOT_DIR/cdk" && npx cdk bootstrap "aws://$ACCOUNT_ID/$REGION" 2>&1 | grep -E "(✅|already)" || true)

# --- Deploy infrastructure ---
echo ""
echo "🚀 Deploying infrastructure..."
OUTPUTS_FILE="$ROOT_DIR/cdk-outputs.json"
(cd "$ROOT_DIR/cdk" && npx cdk deploy \
  DogTrackerDatabase DogTrackerAuth DogTrackerStorage DogTrackerApi DogTrackerFrontend \
  --require-approval never \
  --outputs-file "$OUTPUTS_FILE")

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "❌ Deployment failed — $OUTPUTS_FILE was not written."
  exit 1
fi

# --- Extract outputs without Python ---
# `aws cloudformation describe-stacks` returns outputs as JSON; parse with
# plain shell to avoid a Python dependency.
echo ""
echo "⚙️  Configuring frontend..."
get_output() {
  local stack="$1" key="$2"
  aws cloudformation describe-stacks --stack-name "$stack" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue | [0]" --output text 2>/dev/null
}

USER_POOL_ID=$(get_output DogTrackerAuth UserPoolId)
CLIENT_ID=$(get_output DogTrackerAuth UserPoolClientId)
COGNITO_DOMAIN=$(get_output DogTrackerAuth CognitoDomain)
API_URL=$(get_output DogTrackerApi ApiUrl)
API_URL="${API_URL%/}"  # trim trailing slash

cat > "$ROOT_DIR/frontend/.env" <<EOF
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID
VITE_COGNITO_DOMAIN=$COGNITO_DOMAIN
VITE_API_URL=$API_URL
EOF

echo "   User Pool ID:   $USER_POOL_ID"
echo "   Client ID:      $CLIENT_ID"
echo "   Cognito Domain: $COGNITO_DOMAIN"
echo "   API URL:        $API_URL"

# --- Build frontend ---
echo ""
echo "🔨 Building frontend..."
(cd "$ROOT_DIR/frontend" && npm run build)

# --- Redeploy frontend bucket ---
echo ""
echo "🚀 Deploying frontend assets..."
(cd "$ROOT_DIR/cdk" && npx cdk deploy DogTrackerFrontend --require-approval never)

SITE_URL=$(get_output DogTrackerFrontend DistributionUrl)

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
echo "  If AI chat errors out, enable Bedrock Claude Haiku 4.5 here:"
echo "  https://$REGION.console.aws.amazon.com/bedrock/home?region=$REGION#/modelaccess"
echo "════════════════════════════════════════════"
