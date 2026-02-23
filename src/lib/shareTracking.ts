import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique token for shareable tracking links
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export interface CreateShareLinkParams {
  loadId: string;
  telematicsAssetId: string;
  expiryHours: number;
}

export interface ShareLinkResult {
  id: string;
  token: string;
  expiresAt: string;
  shareUrl: string;
}

export interface TrackingShareLink {
  id: string;
  token: string;
  load_id: string;
  telematics_asset_id: string;
  expires_at: string;
  created_at: string;
  created_by: string | null;
  view_count: number;
  last_viewed_at: string | null;
}

/**
 * Create a shareable tracking link for a load
 * Note: Uses type assertion because the tracking_share_links table 
 * is created via migration and types need to be regenerated
 */
export async function createShareableTrackingLink(
  params: CreateShareLinkParams
): Promise<ShareLinkResult> {
  const { loadId, telematicsAssetId, expiryHours } = params;
  
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);
  
  // Use type assertion for the new table until types are regenerated
  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => {
        select: () => {
          single: () => Promise<{ data: TrackingShareLink | null; error: Error | null }>;
        };
      };
    };
  }).from('tracking_share_links')
    .insert({
      token,
      load_id: loadId,
      telematics_asset_id: telematicsAssetId,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create share link: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create share link: No data returned');
  }

  const shareUrl = `${window.location.origin}/track?token=${token}`;

  return {
    id: data.id,
    token: data.token,
    expiresAt: data.expires_at,
    shareUrl,
  };
}

/**
 * Get all active share links for a load
 */
export async function getShareLinksForLoad(loadId: string): Promise<TrackingShareLink[]> {
  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          gt: (column: string, value: string) => {
            order: (column: string, options: { ascending: boolean }) => Promise<{ data: TrackingShareLink[] | null; error: Error | null }>;
          };
        };
      };
    };
  }).from('tracking_share_links')
    .select('*')
    .eq('load_id', loadId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch share links: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete a share link
 */
export async function deleteShareLink(linkId: string): Promise<void> {
  const { error } = await (supabase as unknown as {
    from: (table: string) => {
      delete: () => {
        eq: (column: string, value: string) => Promise<{ error: Error | null }>;
      };
    };
  }).from('tracking_share_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    throw new Error(`Failed to delete share link: ${error.message}`);
  }
}

/**
 * Validate and get share link by token
 */
export async function getShareLinkByToken(token: string): Promise<TrackingShareLink | null> {
  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          gt: (column: string, value: string) => {
            single: () => Promise<{ data: TrackingShareLink | null; error: Error | null }>;
          };
        };
      };
    };
  }).from('tracking_share_links')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Message format style options
 */
export type ShareMessageStyle = 'professional' | 'detailed' | 'compact' | 'minimal';

/**
 * Load information interface for sharing
 */
export interface ShareableLoadInfo {
  load_id: string;
  origin: string;
  destination: string;
  loading_date: string;
  offloading_date: string;
  cargo_type: string;
  status?: string;
  driver?: { name: string; contact?: string } | null;
  fleet_vehicle?: { vehicle_id: string; type?: string } | null;
  client_name?: string;
}

/**
 * Vehicle information interface for sharing
 */
export interface ShareableVehicleInfo {
  name?: string;
  speedKmH?: number;
  inTrip?: boolean;
  latitude?: number;
  longitude?: number;
  lastConnected?: string;
}

/**
 * Generate a visual progress bar using Unicode characters
 */
function generateProgressBar(percentage: number, length = 10): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Get status emoji and label based on load status
 */
function getStatusDisplay(status?: string, inTrip?: boolean): { emoji: string; label: string; color: string } {
  if (inTrip) {
    return { emoji: '🟢', label: 'IN TRANSIT', color: 'green' };
  }
  
  switch (status?.toLowerCase()) {
    case 'delivered':
      return { emoji: '✅', label: 'DELIVERED', color: 'green' };
    case 'in-transit':
      return { emoji: '🟢', label: 'IN TRANSIT', color: 'green' };
    case 'scheduled':
      return { emoji: '🟡', label: 'SCHEDULED', color: 'yellow' };
    case 'pending':
      return { emoji: '🟠', label: 'PENDING', color: 'orange' };
    default:
      return { emoji: '⚪', label: 'UNKNOWN', color: 'gray' };
  }
}

/**
 * Check if a date string is valid
 */
function isValidDate(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Calculate estimated progress percentage based on dates
 * Returns null if dates are invalid or cannot be calculated
 */
function calculateProgress(loadingDate: string, offloadingDate: string): number | null {
  if (!isValidDate(loadingDate) || !isValidDate(offloadingDate)) {
    return null;
  }
  
  const start = new Date(loadingDate).getTime();
  const end = new Date(offloadingDate).getTime();
  const now = Date.now();
  
  // Invalid if end is before start
  if (end <= start) return null;
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  return Math.round(((now - start) / (end - start)) * 100);
}

/**
 * Format date in a friendly way
 * Returns null if date is invalid
 */
function formatFriendlyDate(dateStr: string | undefined | null): string | null {
  if (!isValidDate(dateStr)) return null;
  
  const date = new Date(dateStr!);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format share message for different platforms with full load details
 * Supports multiple styling options for different use cases
 */
export function formatShareMessage(
  load: ShareableLoadInfo,
  vehicleInfo: ShareableVehicleInfo,
  shareUrl?: string,
  style: ShareMessageStyle = 'professional'
): string {
  switch (style) {
    case 'professional':
      return formatProfessionalMessage(load, vehicleInfo, shareUrl);
    case 'detailed':
      return formatDetailedMessage(load, vehicleInfo, shareUrl);
    case 'compact':
      return formatCompactMessage(load, vehicleInfo, shareUrl);
    case 'minimal':
      return formatMinimalMessage(load, vehicleInfo, shareUrl);
    default:
      return formatProfessionalMessage(load, vehicleInfo, shareUrl);
  }
}

/**
 * Professional format - branded, clean, with visual hierarchy
 */
function formatProfessionalMessage(
  load: ShareableLoadInfo,
  vehicleInfo: ShareableVehicleInfo,
  shareUrl?: string
): string {
  const statusDisplay = getStatusDisplay(load.status, vehicleInfo.inTrip);
  const progress = calculateProgress(load.loading_date, load.offloading_date);
  const loadedDate = formatFriendlyDate(load.loading_date);
  const etaDate = formatFriendlyDate(load.offloading_date);
  
  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━',
    '   🚚 *LOADPLAN TRACKING*',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `${statusDisplay.emoji} *Status:* ${statusDisplay.label}`,
    '',
    '📋 *SHIPMENT DETAILS*',
    '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
    `📦 Load: \`${load.load_id}\``,
    `📍 ${load.origin}`,
    `    ↓`,
    `📍 ${load.destination}`,
    '',
  ];

  // Only add dates if they are valid
  if (loadedDate) {
    lines.push(`📅 Loaded: ${loadedDate}`);
  }
  if (etaDate) {
    lines.push(`🎯 ETA: ${etaDate}`);
  }
  
  // Only add progress bar if it can be calculated
  if (progress !== null) {
    lines.push('');
    lines.push(`*Progress:* ${generateProgressBar(progress)} ${progress}%`);
  }
  
  lines.push('');

  // Cargo info section
  if (load.cargo_type || load.client_name) {
    lines.push('📦 *CARGO INFO*');
    lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
    if (load.cargo_type) lines.push(`Type: ${load.cargo_type}`);
    if (load.client_name) lines.push(`Client: ${load.client_name}`);
    lines.push('');
  }

  // Vehicle & driver section
  if (load.fleet_vehicle?.vehicle_id || load.driver?.name) {
    lines.push('🚛 *VEHICLE & DRIVER*');
    lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
    if (load.fleet_vehicle?.vehicle_id) {
      lines.push(`Vehicle: ${load.fleet_vehicle.vehicle_id}${load.fleet_vehicle.type ? ` (${load.fleet_vehicle.type})` : ''}`);
    }
    if (load.driver?.name) {
      lines.push(`Driver: ${load.driver.name}`);
      if (load.driver.contact) {
        lines.push(`📞 ${load.driver.contact}`);
      }
    }
    lines.push('');
  }

  // Live tracking section
  if (vehicleInfo.speedKmH !== undefined || vehicleInfo.latitude) {
    lines.push('📡 *LIVE POSITION*');
    lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
    if (vehicleInfo.speedKmH !== undefined) {
      const speedEmoji = vehicleInfo.speedKmH > 60 ? '⚡' : vehicleInfo.speedKmH > 0 ? '🏃' : '⏸️';
      lines.push(`${speedEmoji} Speed: ${vehicleInfo.speedKmH} km/h`);
    }
    if (vehicleInfo.latitude && vehicleInfo.longitude) {
      lines.push('');
      lines.push('📍 *View on Maps:*');
      lines.push(`https://maps.google.com/?q=${vehicleInfo.latitude},${vehicleInfo.longitude}`);
    }
    lines.push('');
  }

  // Live tracking link section
  if (shareUrl) {
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🔴 *LIVE TRACKING*');
    lines.push('');
    lines.push(`👇 *Tap to track in real-time:*`);
    lines.push(shareUrl);
    lines.push('');
    lines.push('_⚡ Live updates • No login required_');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  }

  lines.push('');
  lines.push('_Powered by LoadPlan™_');

  return lines.join('\n');
}

/**
 * Detailed format - comprehensive information for internal use
 */
function formatDetailedMessage(
  load: ShareableLoadInfo,
  vehicleInfo: ShareableVehicleInfo,
  shareUrl?: string
): string {
  const statusDisplay = getStatusDisplay(load.status, vehicleInfo.inTrip);
  const progress = calculateProgress(load.loading_date, load.offloading_date);
  const loadingDateValid = isValidDate(load.loading_date);
  const offloadingDateValid = isValidDate(load.offloading_date);
  
  const lines = [
    '🚚 *LIVE VEHICLE TRACKING*',
    '═══════════════════════',
    '',
    `${statusDisplay.emoji} *Status:* ${statusDisplay.label}`,
    '',
    '📦 *SHIPMENT INFORMATION*',
    '───────────────────────',
    `• *Load ID:* ${load.load_id}`,
    `• *Route:* ${load.origin} → ${load.destination}`,
  ];

  if (loadingDateValid) {
    lines.push(`• *Loading Date:* ${new Date(load.loading_date).toLocaleDateString()}`);
  }
  if (offloadingDateValid) {
    lines.push(`• *Expected Arrival:* ${new Date(load.offloading_date).toLocaleDateString()}`);
  }
  if (load.cargo_type) {
    lines.push(`• *Cargo Type:* ${load.cargo_type}`);
  }
  if (progress !== null) {
    lines.push(`• *Progress:* ${progress}%`);
  }

  if (load.client_name) {
    lines.push(`• *Client:* ${load.client_name}`);
  }

  // Driver section
  if (load.driver?.name) {
    lines.push('');
    lines.push('👤 *DRIVER INFORMATION*');
    lines.push('───────────────────────');
    lines.push(`• *Name:* ${load.driver.name}`);
    if (load.driver.contact) {
      lines.push(`• *Contact:* ${load.driver.contact}`);
    }
  }

  // Vehicle section
  if (load.fleet_vehicle?.vehicle_id) {
    lines.push('');
    lines.push('🚛 *VEHICLE INFORMATION*');
    lines.push('───────────────────────');
    lines.push(`• *Fleet No:* ${load.fleet_vehicle.vehicle_id}`);
    if (load.fleet_vehicle.type) {
      lines.push(`• *Type:* ${load.fleet_vehicle.type}`);
    }
  }

  // Current status section
  if (vehicleInfo.speedKmH !== undefined) {
    lines.push('');
    lines.push('📊 *CURRENT STATUS*');
    lines.push('───────────────────────');
    lines.push(`• *Speed:* ${vehicleInfo.speedKmH} km/h`);
    lines.push(`• *Movement:* ${vehicleInfo.inTrip ? '🟢 In Motion' : '🔴 Stationary'}`);
    if (vehicleInfo.lastConnected) {
      lines.push(`• *Last Update:* ${vehicleInfo.lastConnected}`);
    }
  }

  // Location section
  if (vehicleInfo.latitude && vehicleInfo.longitude) {
    lines.push('');
    lines.push('📍 *CURRENT LOCATION*');
    lines.push('───────────────────────');
    lines.push(`GPS: ${vehicleInfo.latitude.toFixed(6)}, ${vehicleInfo.longitude.toFixed(6)}`);
    lines.push('');
    lines.push('*View on Google Maps:*');
    lines.push(`https://www.google.com/maps?q=${vehicleInfo.latitude},${vehicleInfo.longitude}`);
  }

  // Live tracking link
  if (shareUrl) {
    lines.push('');
    lines.push('═══════════════════════');
    lines.push('🔗 *LIVE TRACKING LINK*');
    lines.push('───────────────────────');
    lines.push(shareUrl);
    lines.push('');
    lines.push('_This link provides real-time_');
    lines.push('_vehicle tracking updates._');
  }

  lines.push('');
  lines.push('═══════════════════════');
  lines.push('_LoadPlan Fleet Management_');

  return lines.join('\n');
}

/**
 * Compact format - for quick shares and SMS
 */
function formatCompactMessage(
  load: ShareableLoadInfo,
  vehicleInfo: ShareableVehicleInfo,
  shareUrl?: string
): string {
  const statusDisplay = getStatusDisplay(load.status, vehicleInfo.inTrip);
  const etaDate = formatFriendlyDate(load.offloading_date);
  
  const lines = [
    `${statusDisplay.emoji} *${load.load_id}*`,
    '',
    `📍 ${load.origin} → ${load.destination}`,
  ];

  if (etaDate) {
    lines.push(`🎯 ETA: ${etaDate}`);
  }

  if (load.driver?.name) {
    lines.push(`👤 ${load.driver.name}${load.driver.contact ? ` | ${load.driver.contact}` : ''}`);
  }

  if (vehicleInfo.latitude && vehicleInfo.longitude) {
    lines.push('');
    lines.push(`📍 maps.google.com/?q=${vehicleInfo.latitude},${vehicleInfo.longitude}`);
  }

  if (shareUrl) {
    lines.push('');
    lines.push('🔴 *Track Live:*');
    lines.push(shareUrl);
  }

  return lines.join('\n');
}

/**
 * Minimal format - just the essentials for quick reference
 */
function formatMinimalMessage(
  load: ShareableLoadInfo,
  vehicleInfo: ShareableVehicleInfo,
  shareUrl?: string
): string {
  const lines = [
    `Load ${load.load_id}`,
    `${load.origin} → ${load.destination}`,
  ];

  if (isValidDate(load.offloading_date)) {
    lines.push(`ETA: ${new Date(load.offloading_date).toLocaleDateString()}`);
  }

  if (load.driver?.name) {
    lines.push(`Driver: ${load.driver.name}`);
  }

  if (shareUrl) {
    lines.push(`Track: ${shareUrl}`);
  } else if (vehicleInfo.latitude && vehicleInfo.longitude) {
    lines.push(`Location: https://maps.google.com/?q=${vehicleInfo.latitude},${vehicleInfo.longitude}`);
  }

  return lines.join('\n');
}

/**
 * Generate a QR code placeholder message (QR codes can't be embedded in WhatsApp text)
 * This provides instructions for the recipient to access tracking
 */
export function formatQRInstructionsMessage(
  load: ShareableLoadInfo,
  shareUrl: string
): string {
  return [
    '━━━━━━━━━━━━━━━━━━━━━━',
    '   🚚 *LOADPLAN TRACKING*',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `📦 Load: *${load.load_id}*`,
    `📍 ${load.origin} → ${load.destination}`,
    '',
    '🔗 *TRACK YOUR SHIPMENT*',
    '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
    '',
    '👇 *Tap the link below:*',
    shareUrl,
    '',
    '_Or scan the QR code on the_',
    '_delivery documentation._',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '_Powered by LoadPlan™_',
  ].join('\n');
}

/**
 * Generate a customer-facing notification message
 * More formal tone suitable for end customers
 */
export function formatCustomerNotificationMessage(
  load: ShareableLoadInfo,
  vehicleInfo: ShareableVehicleInfo,
  shareUrl: string,
  companyName = 'LoadPlan'
): string {
  const eta = new Date(load.offloading_date);
  const etaFormatted = eta.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  return [
    `Dear Customer,`,
    '',
    `Your shipment from *${companyName}* is on its way! 📦`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `📋 *Order Reference:* ${load.load_id}`,
    `📍 *Destination:* ${load.destination}`,
    `📅 *Expected Delivery:* ${etaFormatted}`,
    '',
    load.driver?.name ? `🚛 *Your Driver:* ${load.driver.name}` : '',
    load.driver?.contact ? `📞 *Driver Contact:* ${load.driver.contact}` : '',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '🔴 *TRACK YOUR DELIVERY LIVE*',
    '',
    '👇 Tap below to see real-time location:',
    shareUrl,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `Thank you for choosing *${companyName}*!`,
    '',
    '_This is an automated notification._',
    '_For queries, please contact our support team._',
  ].filter(line => line !== '').join('\n');
}

/**
 * Format a simpler message for SMS
 */
export function formatSmsMessage(
  load: {
    load_id: string;
    origin: string;
    destination: string;
    offloading_date: string;
    driver?: { name: string } | null;
  },
  shareUrl: string
): string {
  const arrivalDate = new Date(load.offloading_date).toLocaleDateString();
  return `Load ${load.load_id}: ${load.origin} to ${load.destination}. ETA: ${arrivalDate}. ${load.driver?.name ? `Driver: ${load.driver.name}. ` : ''}Track live: ${shareUrl}`;
}