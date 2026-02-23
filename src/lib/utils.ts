import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to extract display name from origin/destination (handles both string and object formats)
// Third-party loads store locations as objects: { placeName, address, plannedArrival, plannedDeparture }
export function getLocationDisplayName(location: string | { placeName?: string } | null | undefined): string {
  if (!location) return '';
  if (typeof location === 'string') return location;
  if (typeof location === 'object' && location.placeName) return location.placeName;
  return '';
}

/**
 * Format a UTC datetime string as a relative "time ago" label.
 */
export function formatLastConnected(utcString: string | null | undefined): string {
  if (!utcString) return "Never";

  const date = new Date(utcString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}