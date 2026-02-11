#!/bin/bash
# scripts/test-cron.sh
# 크론 엔드포인트 수동 테스트 스크립트

if [ -z "$1" ]; then
  echo "사용법: ./scripts/test-cron.sh <VERCEL_URL> [CRON_SECRET]"
  echo "예시: ./scripts/test-cron.sh https://your-project.vercel.app my_secret"
  exit 1
fi

VERCEL_URL=$1
CRON_SECRET=$2

echo "크론 엔드포인트 테스트 중..."
echo "URL: ${VERCEL_URL}/api/cron"

if [ -n "$CRON_SECRET" ]; then
  echo "Authorization: Bearer ${CRON_SECRET}"
  RESPONSE=$(curl -s -X POST "${VERCEL_URL}/api/cron" \
    -H "Authorization: Bearer ${CRON_SECRET}")
else
  echo "Authorization: 없음"
  RESPONSE=$(curl -s -X POST "${VERCEL_URL}/api/cron")
fi

echo ""
echo "응답:"
echo "$RESPONSE" | jq . || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"message"'; then
  echo ""
  echo "✅ 크론 실행 완료!"
else
  echo ""
  echo "⚠️ 응답 확인 필요"
fi
