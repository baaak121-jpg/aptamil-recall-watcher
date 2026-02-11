#!/bin/bash
# scripts/set-webhook.sh
# Telegram Webhook 설정 스크립트

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "사용법: ./scripts/set-webhook.sh <BOT_TOKEN> <VERCEL_URL>"
  echo "예시: ./scripts/set-webhook.sh 123456:ABC-DEF https://your-project.vercel.app"
  exit 1
fi

BOT_TOKEN=$1
VERCEL_URL=$2

echo "Webhook 설정 중..."
echo "URL: ${VERCEL_URL}/api/telegram"

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${VERCEL_URL}/api/telegram\"}")

echo "응답: $RESPONSE"

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Webhook 설정 완료!"
  
  echo ""
  echo "Webhook 정보 확인 중..."
  curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq .
else
  echo "❌ Webhook 설정 실패"
  exit 1
fi
