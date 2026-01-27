#!/bin/bash

set -e  # exit immediately if any command fails

echo "🚀 Starting deployment..."

echo "🧹 Cleaning old build..."
rm -rf .build .aws-sam

echo "📦 Compiling TypeScript..."
npx tsc

echo "🔧 SAM build..."
sam build

echo "☁️  SAM deploy..."
sam deploy \
  --stack-name appointment-booking-app \
  --region us-east-1 \
  --profile evive-sandbox \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset

echo "✅ Deployment completed successfully!"
