#!/bin/bash

# Telematics Guru API Resource Discovery Script
# Usage: ./check_telematics_resources.sh <username> <password>

TELEMATICS_API_BASE="https://api-emea04.telematics.guru"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$1" ] || [ -z "$2" ]; then
  echo -e "${RED}Usage: $0 <username> <password>${NC}"
  exit 1
fi

USERNAME="$1"
PASSWORD="$2"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Telematics Guru API Resource Discovery${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Authenticate
echo -e "\n${YELLOW}[1/5] Authenticating...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "${TELEMATICS_API_BASE}/v1/user/authenticate" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Username=${USERNAME}&Password=${PASSWORD}")

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Authentication failed!${NC}"
  echo "$AUTH_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
EXPIRES_IN=$(echo "$AUTH_RESPONSE" | jq -r '.expires_in')
echo -e "  Token expires in: ${EXPIRES_IN} seconds"

# Step 2: Get User Info
echo -e "\n${YELLOW}[2/5] Getting user info...${NC}"
USER_INFO=$(curl -s "${TELEMATICS_API_BASE}/v1/user" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json")

echo -e "${GREEN}✓ User Info:${NC}"
echo "$USER_INFO" | jq '.' 2>/dev/null || echo "$USER_INFO"

# Step 3: Get Organisations
echo -e "\n${YELLOW}[3/5] Getting organisations...${NC}"
ORGS=$(curl -s "${TELEMATICS_API_BASE}/v1/user/organisation" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json")

echo -e "${GREEN}✓ Organisations:${NC}"
echo "$ORGS" | jq '.' 2>/dev/null || echo "$ORGS"

# Extract organisation IDs (handle both lowercase and PascalCase)
ORG_IDS=$(echo "$ORGS" | jq -r '.[] | .Id // .id // empty' 2>/dev/null)

if [ -z "$ORG_IDS" ]; then
  echo -e "${RED}No organisations found${NC}"
  exit 1
fi

# Step 4: For each organisation, check available resources
echo -e "\n${YELLOW}[4/5] Checking resources for each organisation...${NC}"

for ORG_ID in $ORG_IDS; do
  ORG_NAME=$(echo "$ORGS" | jq -r ".[] | select(.Id == ${ORG_ID} or .id == ${ORG_ID}) | .Name // .name")
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Organisation: ${ORG_NAME} (ID: ${ORG_ID})${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Check Assets
  echo -e "\n  ${YELLOW}📦 Assets:${NC}"
  ASSETS=$(curl -s "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/asset" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  ASSET_COUNT=$(echo "$ASSETS" | jq 'length' 2>/dev/null || echo "0")
  if [ "$ASSET_COUNT" != "0" ] && [ "$ASSET_COUNT" != "null" ]; then
    echo -e "     ${GREEN}✓ Found ${ASSET_COUNT} asset(s)${NC}"
    echo "$ASSETS" | jq -r '.[] | "       - \(.Name // .name) (ID: \(.Id // .id), Code: \(.Code // .code))"' 2>/dev/null
  else
    echo -e "     ${RED}✗ No assets found or access denied${NC}"
  fi

  # Check Geofences
  echo -e "\n  ${YELLOW}📍 Geofences:${NC}"
  GEOFENCES=$(curl -s "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/geofence" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/geofence" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  if [ "$HTTP_STATUS" == "200" ]; then
    GEOFENCE_COUNT=$(echo "$GEOFENCES" | jq 'length' 2>/dev/null || echo "0")
    if [ "$GEOFENCE_COUNT" != "0" ] && [ "$GEOFENCE_COUNT" != "null" ]; then
      echo -e "     ${GREEN}✓ Found ${GEOFENCE_COUNT} geofence(s)${NC}"
      echo "$GEOFENCES" | jq -r '.[] | "       - \(.Name // .name) (ID: \(.Id // .id))"' 2>/dev/null
    else
      echo -e "     ${YELLOW}○ Geofences endpoint available but empty${NC}"
    fi
  elif [ "$HTTP_STATUS" == "404" ]; then
    echo -e "     ${RED}✗ Geofences not available for this organisation (404)${NC}"
  else
    echo -e "     ${RED}✗ Geofences request failed (HTTP ${HTTP_STATUS})${NC}"
  fi

  # Check Drivers
  echo -e "\n  ${YELLOW}👤 Drivers:${NC}"
  DRIVERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/driver" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  if [ "$DRIVERS_STATUS" == "200" ]; then
    DRIVERS=$(curl -s "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/driver" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Accept: application/json")
    DRIVER_COUNT=$(echo "$DRIVERS" | jq 'length' 2>/dev/null || echo "0")
    echo -e "     ${GREEN}✓ Found ${DRIVER_COUNT} driver(s)${NC}"
    echo "$DRIVERS" | jq -r '.[] | "       - \(.Name // .name) (ID: \(.Id // .id))"' 2>/dev/null | head -5
  else
    echo -e "     ${RED}✗ Drivers endpoint returned HTTP ${DRIVERS_STATUS}${NC}"
  fi

  # Check Trips
  echo -e "\n  ${YELLOW}🚗 Trips:${NC}"
  TRIPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/trip?take=5" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  if [ "$TRIPS_STATUS" == "200" ]; then
    echo -e "     ${GREEN}✓ Trips endpoint available${NC}"
  else
    echo -e "     ${RED}✗ Trips endpoint returned HTTP ${TRIPS_STATUS}${NC}"
  fi

  # Check Alerts
  echo -e "\n  ${YELLOW}⚠️  Alerts:${NC}"
  ALERTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/alert?take=5" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  if [ "$ALERTS_STATUS" == "200" ]; then
    echo -e "     ${GREEN}✓ Alerts endpoint available${NC}"
  else
    echo -e "     ${RED}✗ Alerts endpoint returned HTTP ${ALERTS_STATUS}${NC}"
  fi

  # Check Reports
  echo -e "\n  ${YELLOW}📊 Reports:${NC}"
  REPORTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/report" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  if [ "$REPORTS_STATUS" == "200" ]; then
    REPORTS=$(curl -s "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/report" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Accept: application/json")
    REPORT_COUNT=$(echo "$REPORTS" | jq 'length' 2>/dev/null || echo "0")
    echo -e "     ${GREEN}✓ Found ${REPORT_COUNT} report template(s)${NC}"
  else
    echo -e "     ${RED}✗ Reports endpoint returned HTTP ${REPORTS_STATUS}${NC}"
  fi

  # Check Groups
  echo -e "\n  ${YELLOW}📁 Asset Groups:${NC}"
  GROUPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/group" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  if [ "$GROUPS_STATUS" == "200" ]; then
    GROUPS=$(curl -s "${TELEMATICS_API_BASE}/v1/organisation/${ORG_ID}/group" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Accept: application/json")
    GROUP_COUNT=$(echo "$GROUPS" | jq 'length' 2>/dev/null || echo "0")
    echo -e "     ${GREEN}✓ Found ${GROUP_COUNT} group(s)${NC}"
    echo "$GROUPS" | jq -r '.[] | "       - \(.Name // .name) (ID: \(.Id // .id))"' 2>/dev/null | head -5
  else
    echo -e "     ${RED}✗ Groups endpoint returned HTTP ${GROUPS_STATUS}${NC}"
  fi

done

# Step 5: Summary
echo -e "\n${YELLOW}[5/5] Testing additional API endpoints...${NC}"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Additional API Endpoints Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test common endpoints
ENDPOINTS=(
  "/v1/user"
  "/v1/user/organisation"
  "/v1/user/permission"
)

for ENDPOINT in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMATICS_API_BASE}${ENDPOINT}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json")
  
  if [ "$STATUS" == "200" ]; then
    echo -e "  ${GREEN}✓${NC} ${ENDPOINT} - Available"
  else
    echo -e "  ${RED}✗${NC} ${ENDPOINT} - HTTP ${STATUS}"
  fi
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Resource discovery complete!${NC}"
echo -e "${GREEN}========================================${NC}"
