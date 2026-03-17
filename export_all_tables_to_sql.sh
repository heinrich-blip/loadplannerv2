
#!/bin/bash

# Set your API key
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncXRjeWJpeHpqdmR0d3JvamdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzE0NTgsImV4cCI6MjA4MzI0NzQ1OH0.GPX5eHiXvgAUDCcmwzzNK2IMqigw35EEGo9g64KMF3M"

# Create output directory
mkdir -p sql_exports

echo "Starting database export..."

# List of all tables from the Swagger definition
TABLES=(
    "loads"
    "clients"
    "drivers"
    "fleet_vehicles"
    "geofence_events"
    "custom_locations"
    "asset_positions"
    "telematics_positions"
    "diesel_orders"
    "client_feedback"
    "tracking_share_links"
)

# Views (read-only, but we can export data)
VIEWS=(
    "loads_with_positions"
    "map_vehicles"
    "active_loads_with_geofence_events"
    "geofence_events_with_load_details"
    "combined_asset_positions"
    "asset_latest_positions"
    "asset_positions_from_geofence"
    "load_positions_from_geofence"
    "loads_at_geofences"
)

echo "Exporting tables..."
for TABLE in "${TABLES[@]}"; do
    echo "Exporting $TABLE..."
    
    # Create SQL file header
    echo "-- SQL dump for table: $TABLE" > "sql_exports/${TABLE}.sql"
    echo "-- Generated on $(date)" >> "sql_exports/${TABLE}.sql"
    echo "" >> "sql_exports/${TABLE}.sql"
    echo "BEGIN;" >> "sql_exports/${TABLE}.sql"
    echo "" >> "sql_exports/${TABLE}.sql"
    
    # Fetch data and convert to SQL
    curl -s -X GET \
        "https://tgqtcybixzjvdtwrojgq.supabase.co/rest/v1/${TABLE}" \
        -H "apikey: $VITE_SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Accept: application/json" | \
    python3 -c "
import sys, json

data = json.load(sys.stdin)

def quote(val):
    if val is None:
        return 'NULL'
    if isinstance(val, bool):
        return 'true' if val else 'false'
    if isinstance(val, (int, float)):
        return str(val)
    # Handle datetime strings
    if isinstance(val, str) and '+00:00' in val:
        val = val.replace('+00:00', '')
    return \"'\" + str(val).replace(\"'\", \"''\") + \"'\"

if not data:
    print(f'-- No data found for table')
    sys.exit(0)

# Get columns from first row
columns = list(data[0].keys())
print(f'INSERT INTO {sys.argv[1]} (')
print('    ' + ', '.join(columns))
print(') VALUES')

for idx, row in enumerate(data):
    values = []
    for col in columns:
        val = row.get(col)
        values.append(quote(val))
    
    line = '    (' + ', '.join(values) + ')'
    if idx < len(data) - 1:
        line += ','
    print(line)
print(';')
" "$TABLE" >> "sql_exports/${TABLE}.sql"
    
    echo "" >> "sql_exports/${TABLE}.sql"
    echo "COMMIT;" >> "sql_exports/${TABLE}.sql"
    
    echo "✓ Exported ${TABLE} to sql_exports/${TABLE}.sql"
done

echo ""
echo "Exporting views (as SELECT statements)..."
for VIEW in "${VIEWS[@]}"; do
    echo "Exporting view: $VIEW..."
    
    echo "-- View data for: $VIEW" > "sql_exports/view_${VIEW}.sql"
    echo "-- Generated on $(date)" >> "sql_exports/view_${VIEW}.sql"
    echo "" >> "sql_exports/view_${VIEW}.sql"
    
    curl -s -X GET \
        "https://tgqtcybixzjvdtwrojgq.supabase.co/rest/v1/${VIEW}" \
        -H "apikey: $VITE_SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
        -H "Accept: application/json" | \
    python3 -m json.tool >> "sql_exports/view_${VIEW}.sql" 2>/dev/null || \
    echo "-- No data or error fetching view" >> "sql_exports/view_${VIEW}.sql"
    
    echo "✓ Exported view ${VIEW}"
done

echo ""
echo "Creating complete database dump file..."

cat > sql_exports/complete_database_dump.sql << 'EOFF'
-- =====================================================
-- COMPLETE DATABASE DUMP
-- Generated from Supabase project
-- Date: $(date)
-- =====================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

EOFF

# Combine all table SQL files
for TABLE in "${TABLES[@]}"; do
    echo "" >> sql_exports/complete_database_dump.sql
    echo "-- ===================================================" >> sql_exports/complete_database_dump.sql
    echo "-- Table: $TABLE" >> sql_exports/complete_database_dump.sql
    echo "-- ===================================================" >> sql_exports/complete_database_dump.sql
    cat "sql_exports/${TABLE}.sql" >> sql_exports/complete_database_dump.sql
done

echo "COMMIT;" >> sql_exports/complete_database_dump.sql

echo ""
echo "✅ Export complete!"
echo "📁 Files saved in: sql_exports/"
echo "   - Individual table dumps: sql_exports/[table_name].sql"
echo "   - Complete database dump: sql_exports/complete_database_dump.sql"
ls -la sql_exports/
