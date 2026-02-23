import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Google Sheets Sync Edge Function
 * 
 * Syncs load time data (planned vs actual departure/arrival) to a Google Sheet.
 * Called automatically via a database webhook whenever loads are updated,
 * or manually via a POST request.
 *
 * Target spreadsheet: https://docs.google.com/spreadsheets/d/1Ep1ZpTBMT416mm9ZeC6sxl5tIrk1uU8RfSQy30xyMgM/edit
 * Spreadsheet ID:     1Ep1ZpTBMT416mm9ZeC6sxl5tIrk1uU8RfSQy30xyMgM
 *
 * Required environment variables (set via `supabase secrets set`):
 *   SUPABASE_URL                  – (auto-set by Supabase)
 *   SUPABASE_SERVICE_ROLE_KEY     – (auto-set by Supabase)
 *   GOOGLE_SHEETS_SPREADSHEET_ID  – 1Ep1ZpTBMT416mm9ZeC6sxl5tIrk1uU8RfSQy30xyMgM
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  – Google service account email (e.g. xxx@project.iam.gserviceaccount.com)
 *   GOOGLE_SERVICE_ACCOUNT_KEY    – Google service account private key (PEM, with \n replaced by \\n)
 *
 * Setup steps:
 *   1. Go to https://console.cloud.google.com → Create or select a project
 *   2. Enable the "Google Sheets API"
 *   3. Create a Service Account (IAM & Admin → Service Accounts → Create)
 *   4. Create a JSON key for the service account and download it
 *   5. Share the Google Sheet with the service account email (Editor access)
 *   6. Set the secrets:
 *      supabase secrets set GOOGLE_SHEETS_SPREADSHEET_ID=1Ep1ZpTBMT416mm9ZeC6sxl5tIrk1uU8RfSQy30xyMgM
 *      supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
 *      supabase secrets set GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SPREADSHEET_ID = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID') || '1Ep1ZpTBMT416mm9ZeC6sxl5tIrk1uU8RfSQy30xyMgM';
const SERVICE_ACCOUNT_EMAIL = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') || '';
const SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// Google Auth – create a JWT and exchange it for an access token
// ---------------------------------------------------------------------------

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createGoogleJWT(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the PEM private key
  const pemKey = SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');
  const pemBody = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, enc.encode(unsignedToken)),
  );

  return `${unsignedToken}.${base64url(signature)}`;
}

async function getGoogleAccessToken(): Promise<string> {
  const jwt = await createGoogleJWT();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ---------------------------------------------------------------------------
// Google Sheets helpers
// ---------------------------------------------------------------------------

async function ensureSheetExists(accessToken: string, sheetName: string): Promise<void> {
  // Get current spreadsheet metadata to check if the tab exists
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`Failed to read spreadsheet metadata: ${err}`);
  }
  const meta = await metaRes.json();
  const exists = meta.sheets?.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.properties?.title === sheetName,
  );
  if (exists) return;

  // Create the sheet tab
  const addRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      }),
    },
  );
  if (!addRes.ok) {
    const err = await addRes.text();
    throw new Error(`Failed to create sheet tab "${sheetName}": ${err}`);
  }
}

async function clearSheet(accessToken: string, sheetName: string): Promise<void> {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
  );
}

async function updateSheet(
  accessToken: string,
  sheetName: string,
  values: (string | number | null)[][],
): Promise<void> {
  const range = `${sheetName}!A1`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets update failed: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Get sheetId for formatting (the numeric ID, not the name)
// ---------------------------------------------------------------------------

async function getSheetId(accessToken: string, sheetName: string): Promise<number | null> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) return null;
  const meta = await metaRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheet = meta.sheets?.find((s: any) => s.properties?.title === sheetName);
  return sheet ? sheet.properties.sheetId : null;
}

// ---------------------------------------------------------------------------
// Apply conditional formatting: red for late variance cells, green for early
// ---------------------------------------------------------------------------

async function applyVarianceFormatting(
  accessToken: string,
  sheetId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  varianceMap: { row: number; col: number; isLate: boolean; isEarly: boolean }[],
  totalRows: number,
  totalCols: number,
  weekHeaderRows: number[] = [],
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = [];

  // Header row formatting: bold + grey background
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: totalCols },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
          textFormat: { bold: true, fontSize: 10 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  });

  // Freeze header row
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // Red background for late cells, green for early
  for (const cell of varianceMap) {
    const bgColor = cell.isLate
      ? { red: 1.0, green: 0.8, blue: 0.8 }   // light red
      : { red: 0.8, green: 1.0, blue: 0.8 };    // light green

    const textColor = cell.isLate
      ? { red: 0.7, green: 0.0, blue: 0.0 }   // dark red text
      : { red: 0.0, green: 0.5, blue: 0.0 };    // dark green text

    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: cell.row,
          endRowIndex: cell.row + 1,
          startColumnIndex: cell.col,
          endColumnIndex: cell.col + 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: bgColor,
            textFormat: { bold: true, foregroundColor: textColor },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
  }

  // Week header rows: dark blue background, white bold text, merge across all columns
  for (const weekRow of weekHeaderRows) {
    // Merge cells across the full width
    requests.push({
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: weekRow,
          endRowIndex: weekRow + 1,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
        mergeType: 'MERGE_ALL',
      },
    });
    // Style: dark blue bg, white bold text, slightly larger font
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: weekRow,
          endRowIndex: weekRow + 1,
          startColumnIndex: 0,
          endColumnIndex: totalCols,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.16, green: 0.25, blue: 0.45 },  // dark navy blue
            textFormat: {
              bold: true,
              fontSize: 11,
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },  // white text
            },
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE',
            padding: { top: 4, bottom: 4 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)',
      },
    });
    // Set row height slightly taller for week headers
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: weekRow,
          endIndex: weekRow + 1,
        },
        properties: { pixelSize: 32 },
        fields: 'pixelSize',
      },
    });
  }

  // Auto-resize columns
  requests.push({
    autoResizeDimensions: {
      dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: totalCols },
    },
  });

  if (requests.length === 0) return;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    console.error(`Formatting failed (non-fatal): ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function timeToMinutes(time: string | undefined | null): number | null {
  if (!time) return null;
  // Plain HH:mm — parse directly
  const hm = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  // ISO timestamp — convert to SAST (UTC+2) before extracting hours
  const d = new Date(time);
  if (!isNaN(d.getTime())) {
    const parts = new Intl.DateTimeFormat('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Johannesburg',
    }).formatToParts(d);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
    return h * 60 + m;
  }
  return null;
}

function computeVariance(
  planned: string | undefined | null,
  actual: string | undefined | null,
): { label: string; diffMin: number | null; isLate: boolean } {
  const pMin = timeToMinutes(planned);
  const aMin = timeToMinutes(actual);
  if (pMin === null || aMin === null) return { label: '', diffMin: null, isLate: false };
  const diff = aMin - pMin;
  if (diff === 0) return { label: 'On time', diffMin: 0, isLate: false };
  const abs = Math.abs(diff);
  const hrs = Math.floor(abs / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  const tag = diff > 0 ? 'late' : 'early';
  return { label: `${parts.join(' ')} ${tag}`, diffMin: diff, isLate: diff > 0 };
}

function formatTime(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    // Simple "HH:mm" format — return as-is (padded)
    if (/^\d{1,2}:\d{2}$/.test(ts)) return ts.padStart(5, '0');
    // Parse as Date and convert to SAST (Africa/Johannesburg, UTC+2).
    // The edge function runs in UTC so we must explicitly convert.
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    // Use Intl to format in the correct timezone
    const parts = new Intl.DateTimeFormat('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Johannesburg',
    }).formatToParts(d);
    const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
    return `${hour}:${minute}`;
  } catch {
    return ts;
  }
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
}

/** Get the ISO week number for a date */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Get Monday of the ISO week containing the given date */
function getWeekMonday(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

/** Format a week header label like "Week 8 — 17 Feb – 23 Feb 2026" */
function weekLabel(date: Date): string {
  const weekNum = getISOWeek(date);
  const monday = getWeekMonday(date);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDay = (d: Date) => `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  return `Week ${weekNum} — ${fmtDay(monday)} – ${fmtDay(sunday)} ${sunday.getUTCFullYear()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTimeWindow(tw: any): { origin: any; destination: any } {
  try {
    const data = typeof tw === 'string' ? JSON.parse(tw || '{}') : (tw ?? {});
    return {
      origin: data.origin || {},
      destination: data.destination || {},
    };
  } catch {
    return { origin: {}, destination: {} };
  }
}

function buildNote(
  label: string,
  planned: string | undefined | null,
  actual: string | undefined | null,
): string {
  const v = computeVariance(planned, actual);
  if (v.diffMin === null) return '';
  if (v.diffMin === 0) return `${label}: On time`;
  if (v.isLate) return `⚠️ ${label}: ${v.label} — time not met`;
  return `${label}: ${v.label}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate configuration
    if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Google Sheets integration not configured',
          setup: {
            required: [
              'GOOGLE_SHEETS_SPREADSHEET_ID',
              'GOOGLE_SERVICE_ACCOUNT_EMAIL',
              'GOOGLE_SERVICE_ACCOUNT_KEY',
            ],
            instructions: [
              '1. Create a Google Cloud project and enable the Google Sheets API',
              '2. Create a service account and download the JSON key',
              '3. Share your Google Sheet with the service account email',
              '4. Set the environment variables in Supabase Edge Function secrets',
            ],
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse optional body — allows filtering by load IDs or date range
    let loadIds: string[] | null = null;
    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        loadIds = body.loadIds || null;
        dateFrom = body.dateFrom || null;
        dateTo = body.dateTo || null;
      } catch {
        // Empty body is fine — sync all loads
      }
    }

    // Fetch loads from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let query = supabase
      .from('loads')
      .select(`
        id, load_id, status, origin, destination, cargo_type, loading_date, offloading_date,
        time_window, notes,
        actual_loading_arrival, actual_loading_arrival_verified, actual_loading_arrival_source,
        actual_loading_departure, actual_loading_departure_verified, actual_loading_departure_source,
        actual_offloading_arrival, actual_offloading_arrival_verified, actual_offloading_arrival_source,
        actual_offloading_departure, actual_offloading_departure_verified, actual_offloading_departure_source,
        fleet_vehicles!loads_fleet_vehicle_id_fkey(vehicle_id, type),
        drivers!loads_driver_id_fkey(name, contact)
      `)
      .order('loading_date', { ascending: true });

    if (loadIds && loadIds.length > 0) {
      query = query.in('id', loadIds);
    }
    if (dateFrom) {
      query = query.gte('loading_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('loading_date', dateTo);
    }

    const { data: loads, error: loadError } = await query;
    if (loadError) throw loadError;
    if (!loads || loads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No loads found to sync', rowsSynced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build sheet data
    const SHEET_NAME = 'Time Comparison';

    const headerRow = [
      'Load ID', 'Status', 'Vehicle', 'Driver', 'Origin', 'Destination', 'Loading Date',
      'Planned Loading Arrival', 'Actual Loading Arrival', 'Loading Arrival Variance',
      'Planned Loading Departure', 'Actual Loading Departure', 'Loading Departure Variance',
      'Planned Offloading Arrival', 'Actual Offloading Arrival', 'Offloading Arrival Variance',
      'Planned Offloading Departure', 'Actual Offloading Departure', 'Offloading Departure Variance',
      'Late Reason', 'Notes', 'Last Updated',
    ];

    // Track cells that need red/green formatting: { row, col, isLate, isEarly }
    const varianceCells: { row: number; col: number; isLate: boolean; isEarly: boolean }[] = [];
    // Track which rows are week-header rows (for formatting)
    const weekHeaderRows: number[] = [];

    // Variance column indices (0-based): 9, 12, 15, 18
    const VARIANCE_COL_INDICES = [9, 12, 15, 18];

    // Build per-load row data first, then group by week
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loadRows: { weekKey: string; weekLabelText: string; variances: { diffMin: number | null; isLate: boolean }[]; row: any[] }[] = loads.map((load: any) => {
      const tw = parseTimeWindow(load.time_window);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vehicle = (load.fleet_vehicles as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const driver = (load.drivers as any);

      const actualLA = load.actual_loading_arrival || tw.origin.actualArrival || '';
      const actualLD = load.actual_loading_departure || tw.origin.actualDeparture || '';
      const actualOA = load.actual_offloading_arrival || tw.destination.actualArrival || '';
      const actualOD = load.actual_offloading_departure || tw.destination.actualDeparture || '';

      const laVar = computeVariance(tw.origin.plannedArrival, actualLA);
      const ldVar = computeVariance(tw.origin.plannedDeparture, actualLD);
      const oaVar = computeVariance(tw.destination.plannedArrival, actualOA);
      const odVar = computeVariance(tw.destination.plannedDeparture, actualOD);

      const notes: string[] = [];
      const n1 = buildNote('Loading Arrival', tw.origin.plannedArrival, actualLA);
      const n2 = buildNote('Loading Departure', tw.origin.plannedDeparture, actualLD);
      const n3 = buildNote('Offloading Arrival', tw.destination.plannedArrival, actualOA);
      const n4 = buildNote('Offloading Departure', tw.destination.plannedDeparture, actualOD);
      if (n1) notes.push(n1);
      if (n2) notes.push(n2);
      if (n3) notes.push(n3);
      if (n4) notes.push(n4);

      // Get variance reason from time_window JSON (per-field notes + legacy combined)
      let varianceReason = '';
      try {
        const rawTw = typeof load.time_window === 'string' ? JSON.parse(load.time_window || '{}') : (load.time_window ?? {});
        // Prefer per-field notes if available
        const perField: string[] = [];
        if (rawTw.origin?.arrivalNote) perField.push(`Load Arr: ${rawTw.origin.arrivalNote}`);
        if (rawTw.origin?.departureNote) perField.push(`Load Dep: ${rawTw.origin.departureNote}`);
        if (rawTw.destination?.arrivalNote) perField.push(`Offload Arr: ${rawTw.destination.arrivalNote}`);
        if (rawTw.destination?.departureNote) perField.push(`Offload Dep: ${rawTw.destination.departureNote}`);
        varianceReason = perField.length > 0 ? perField.join(' | ') : (rawTw.varianceReason || '');
      } catch { /* ignore */ }

      // Compute week key for grouping (YYYY-Www)
      const loadDate = new Date(load.loading_date);
      const wk = getISOWeek(loadDate);
      const yr = loadDate.getFullYear();
      const weekKey = `${yr}-W${String(wk).padStart(2, '0')}`;
      const weekLabelText = weekLabel(loadDate);

      return {
        weekKey,
        weekLabelText,
        variances: [laVar, ldVar, oaVar, odVar],
        row: [
          load.load_id,
          load.status,
          vehicle?.vehicle_id || '',
          driver?.name || '',
          load.origin,
          load.destination,
          formatDate(load.loading_date),
          tw.origin.plannedArrival || '',
          formatTime(actualLA),
          laVar.label,
          tw.origin.plannedDeparture || '',
          formatTime(actualLD),
          ldVar.label,
          tw.destination.plannedArrival || '',
          formatTime(actualOA),
          oaVar.label,
          tw.destination.plannedDeparture || '',
          formatTime(actualOD),
          odVar.label,
          varianceReason,
          notes.join(' | '),
          new Date().toISOString(),
        ],
      };
    });

    // Assemble final rows with week headers inserted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRows: any[][] = [headerRow];
    let currentWeek = '';
    const colCount = headerRow.length;

    for (const item of loadRows) {
      if (item.weekKey !== currentWeek) {
        currentWeek = item.weekKey;
        // Insert a week header row — text in first cell, rest empty
        const weekRow = new Array(colCount).fill('');
        weekRow[0] = item.weekLabelText;
        weekHeaderRows.push(allRows.length); // 0-based row index
        allRows.push(weekRow);
      }
      // Track variance cells (adjust for actual row position)
      const rowIndex = allRows.length; // row index in the sheet
      item.variances.forEach((v: { diffMin: number | null; isLate: boolean }, vi: number) => {
        if (v.diffMin !== null && v.diffMin !== 0) {
          varianceCells.push({
            row: rowIndex,
            col: VARIANCE_COL_INDICES[vi],
            isLate: v.isLate,
            isEarly: !v.isLate,
          });
        }
      });
      allRows.push(item.row);
    }

    // Authenticate with Google and push data
    const accessToken = await getGoogleAccessToken();
    await ensureSheetExists(accessToken, SHEET_NAME);
    await clearSheet(accessToken, SHEET_NAME);
    await updateSheet(accessToken, SHEET_NAME, allRows);

    // Apply red/green formatting to variance cells + week header styling
    const sheetId = await getSheetId(accessToken, SHEET_NAME);
    if (sheetId !== null) {
      await applyVarianceFormatting(accessToken, sheetId, varianceCells, allRows.length, headerRow.length, weekHeaderRows);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${loadRows.length} loads to Google Sheets`,
        rowsSynced: loadRows.length,
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
