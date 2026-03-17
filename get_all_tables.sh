#!/bin/bash
TABLES=("table1" "table2" "table3")  # Replace with your actual table names

for TABLE in "${TABLES[@]}"; do
  echo "Getting structure for $TABLE..."
  curl -s -X GET \
    "https://tgqtcybixzjvdtwrojgq.supabase.co/rest/v1/$TABLE?limit=1" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
    -H "Accept: application/json" > "${TABLE}_sample.json"
done