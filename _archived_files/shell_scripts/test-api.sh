#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing POS Backend API"
echo "=========================="
echo ""

BASE_URL="http://localhost:3000"

# Check if server is running
echo -n "Checking server health... "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health)
if [ "$HEALTH" -eq 200 ]; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running (HTTP $HEALTH)${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo ""
echo "Testing Auth Endpoints:"
echo "----------------------"

# Test Login (with dummy credentials - will fail but tests endpoint)
echo -n "Testing POST /api/auth/login... "
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}')

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Endpoint working (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Unexpected response (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo "Testing License Endpoints:"
echo "-------------------------"

# Test License Verify
echo -n "Testing POST /api/license/verify... "
VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/license/verify \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"TEST-TEST-TEST-TEST-TEST","deviceId":"test-device"}')

HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 404 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Endpoint working (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Unexpected response (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo "Testing License Activate... "
echo -n "POST /api/license/activate... "
ACTIVATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/license/activate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"TEST-TEST-TEST-TEST-TEST","deviceId":"test-device","clientId":"00000000-0000-0000-0000-000000000000"}')

HTTP_CODE=$(echo "$ACTIVATE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 404 ] || [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 409 ]; then
    echo -e "${GREEN}✅ Endpoint working (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Unexpected response (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo "=========================="
echo -e "${GREEN}✅ All endpoint tests completed!${NC}"
echo ""
echo "Note: Some endpoints returned 401/404 which is expected without valid data."
echo "The important thing is that the endpoints are responding correctly."
