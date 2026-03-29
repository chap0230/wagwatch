# 🐾 Wag Watch

> Keep a close, caring eye on the health trends that keep your dog's tail wagging.

A mobile-friendly web application for tracking the daily health of senior dogs. Multiple caregivers in a household can log health events throughout the day, track medications, view trends over time, and chat with an AI assistant to analyze health data.

## Features

- **Quick Event Logging** — Tap the + button to log events as they happen
- **Potty Tracking** — Log pee/poop events with inside/outside location
- **Medical Events** — Track diarrhea, vomiting, seizures, and more with severity levels
- **Day & Night Ratings** — 1-5 emoji scale (😢😟😐🙂😄)
- **Behavioral Changes** — Track licking, tiredness, pacing, confusion, and more
- **Medication Management** — Track medications with dosage, frequency, and start/stop history
- **Multi-Dog Support** — Track multiple dogs in one household
- **Multi-User Households** — Share data between caregivers with invite codes
- **Calendar Heatmap** — Visual overview of day ratings over time
- **Trend Charts** — Line and bar charts for accidents, medical events, and ratings
- **AI Chat** — Ask questions about your dog's health data powered by Amazon Bedrock + Claude
- **Vet Reports** — Export PDF and CSV reports to share with your veterinarian
- **Dog Profiles** — Store breed, age, weight, photo, vet contact, conditions, and allergies

## Quick Start

### Prerequisites

- **Node.js 20+** and **npm 9+** — [Install](https://nodejs.org)
- **AWS CLI v2** — [Install](https://aws.amazon.com/cli/) and configure with `aws configure`
- **AWS CDK CLI** — `npm install -g aws-cdk`
- **Python 3** — Required by the deploy script (pre-installed on macOS/Linux)

### One-Command Deploy

```bash
git clone <this-repo> senior-dog-health-tracker
cd senior-dog-health-tracker
./deploy.sh
```

The deploy script will:
1. ✅ Check prerequisites (Node.js, AWS CLI, credentials)
2. 📦 Install all dependencies
3. 🔨 Build the backend Lambda functions
4. ☁️ Bootstrap CDK in your account
5. 🚀 Deploy all 5 CloudFormation stacks
6. ⚙️ Auto-configure the frontend with deployed resource IDs
7. 🔨 Build the frontend with real configuration
8. 🚀 Deploy the frontend to CloudFront

At the end, you'll see your app URL. Open it on your phone and create an account!

**Options:**
```bash
./deploy.sh --region us-east-1    # Deploy to a specific region (default: us-west-2)
```

### Enable AI Chat (Required for Chat Feature)

After deploying, enable the Bedrock model in the AWS Console:

1. Go to **Amazon Bedrock** → **Model access** in your deployed region
2. Click **Manage model access**
3. Enable **Anthropic Claude 3.5 Haiku**
4. Wait for access to be granted (~1 minute)

### Post-Deploy: Enable Google Sign-In (Optional)

1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Store the secret in AWS:
   ```bash
   aws secretsmanager create-secret \
     --name dog-tracker/google-oauth \
     --secret-string '{"clientSecret":"YOUR_GOOGLE_CLIENT_SECRET"}'
   ```
3. Edit `cdk/lib/stacks/auth-stack.ts` — uncomment the Google IdP block and set your client ID
4. Redeploy: `cd cdk && npx cdk deploy DogTrackerAuth --require-approval never`

## Architecture

Fully serverless on AWS, following the AWS Well-Architected Framework.

```
Mobile Browser → CloudFront → S3 (React SPA)
                            → API Gateway → Lambda (API)  → DynamoDB
                                         → Lambda (Chat) → Bedrock (Claude)
                            → Cognito (Auth)
                            → S3 (Dog Photos)
```

### AWS Services

| Service | Purpose |
|---------|---------|
| Amazon Cognito | User authentication (email/password + optional Google) |
| Amazon API Gateway | REST API with JWT authorization |
| AWS Lambda | API handler (256MB, 15s) + Chat handler (512MB, 60s) |
| Amazon DynamoDB | 6 tables — households, users, dogs, events, medications, chat sessions |
| Amazon S3 | Frontend hosting + dog photo storage |
| Amazon CloudFront | CDN with HTTPS and SPA routing |
| Amazon Bedrock | AI chat using Anthropic Claude 3.5 Haiku |
| AWS CDK | Infrastructure as Code (TypeScript) |

### CDK Stacks

| Stack | Resources |
|-------|-----------|
| `DogTrackerDatabase` | 6 DynamoDB tables with GSIs, point-in-time recovery, TTL |
| `DogTrackerAuth` | Cognito User Pool, app client, hosted domain |
| `DogTrackerStorage` | S3 bucket for dog photos |
| `DogTrackerApi` | API Gateway + 2 Lambda functions |
| `DogTrackerFrontend` | S3 + CloudFront distribution |

## Development

### Run frontend locally

```bash
cd frontend
npm run dev    # http://localhost:5173
```

### Run tests

```bash
cd backend && npm test       # Backend — Jest (62 tests)
cd cdk && npm test           # CDK — Jest (20 tests)
cd frontend && npx vitest    # Frontend — Vitest (38 tests)
```

### Redeploy after code changes

```bash
cd backend && npm run build
cd ../frontend && npm run build
cd ../cdk && npx cdk deploy --all --require-approval never
```

## Project Structure

```
senior-dog-health-tracker/
├── deploy.sh                   # One-command deploy script
├── destroy.sh                  # Teardown script
├── README.md
├── backend/                    # Lambda functions (TypeScript)
│   ├── src/
│   │   ├── api-handler.ts      # Main API Lambda
│   │   ├── chat-handler.ts     # Bedrock AI chat Lambda
│   │   ├── db.ts               # DynamoDB client
│   │   ├── auth-context.ts     # JWT auth extraction
│   │   └── handlers/           # Route handlers
│   └── tests/
├── frontend/                   # React SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── contexts/           # Auth + Dog providers
│   │   ├── lib/                # API client, charts, exports
│   │   └── pages/              # Route pages
│   ├── e2e/                    # Playwright E2E tests
│   └── .env.example            # Environment template
└── cdk/                        # AWS CDK (TypeScript)
    ├── bin/cdk.ts              # App entry point
    └── lib/stacks/             # 5 CDK stacks
```

## Estimated Monthly Cost

For a 2-person household tracking 1-2 dogs (~10 events/day, ~5 AI queries/day):

| Service | Monthly Cost |
|---------|-------------|
| Cognito, API Gateway, Lambda, DynamoDB, S3, CloudFront | **$0.00** (free tier) |
| Bedrock Claude 3.5 Haiku (~150 queries/mo) | **~$0.70** |
| **Total** | **~$0.70/month** |

Without AI chat, the app runs at $0.00/month within the AWS free tier.

| AI Usage | Queries/Day | Monthly Cost |
|----------|------------|-------------|
| Light | 5 | ~$0.70 |
| Moderate | 20 | ~$2.70 |
| Heavy | 50 | ~$6.50 |

## Cleanup

```bash
./destroy.sh
```

DynamoDB tables and the photos S3 bucket have retention policies and must be deleted manually from the AWS Console after stack destruction.

## License

MIT
