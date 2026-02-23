/**
 * Shared constants and configuration for load forms.
 *
 * Used by CreateLoadDialog, EditLoadDialog, and anywhere else that
 * needs the canonical list of origins, destinations, cargo types, etc.
 */

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export const origins = ["BV", "CBC"] as const;

export const destinations = [
  "Bulawayo Depot",
  "Rezende Depot",
  "Mutare Depot",
] as const;

export const exportDestinations = [
  "Freshmark Centurion",
  "Freshmark Polokwane",
  "Fresh Approach CPT",
  "Fresh Approach PE",
  "Farmerstrust Market",
  "Dapper Market",
] as const;

export const backloadDestinations = ["BV", "CBC"] as const;

// ---------------------------------------------------------------------------
// Cargo types
// ---------------------------------------------------------------------------

export const backloadCargoTypes = [
  { value: "Packaging", label: "Packaging" },
  { value: "Fertilizer", label: "Fertilizer" },
] as const;

// ---------------------------------------------------------------------------
// Default planned times by location
// ---------------------------------------------------------------------------

export const originDefaults: Record<
  string,
  { arrival: string; departure: string }
> = {
  BV: { arrival: "15:00", departure: "17:00" },
  CBC: { arrival: "15:00", departure: "17:00" },
};

export const destinationDefaults: Record<
  string,
  { arrival: string; departure: string }
> = {
  "Bulawayo Depot": { arrival: "08:00", departure: "11:00" },
  "Rezende Depot": { arrival: "05:00", departure: "07:00" },
  "Mutare Depot": { arrival: "06:00", departure: "09:00" },
  "Freshmark Centurion": { arrival: "06:00", departure: "09:00" },
  "Freshmark Polokwane": { arrival: "07:00", departure: "10:00" },
  "Fresh Approach CPT": { arrival: "06:00", departure: "09:00" },
  "Fresh Approach PE": { arrival: "07:00", departure: "10:00" },
  "Farmerstrust Market": { arrival: "05:00", departure: "08:00" },
  "Dapper Market": { arrival: "06:00", departure: "09:00" },
};

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const cargoLabels: Record<string, string> = {
  VanSalesRetail: "Van Sales/Retail",
  Retail: "Retail",
  Vendor: "Vendor",
  RetailVendor: "Retail Vendor",
  Fertilizer: "Fertilizer",
  BV: "BV (Backload)",
  CBC: "CBC (Backload)",
  Packaging: "Packaging (Backload)",
  Export: "Export",
};

export const statusLabels: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  "in-transit": "In Transit",
  delivered: "Delivered",
};

// Default export for consumers that prefer namespace/default imports
export default {
  origins,
  destinations,
  exportDestinations,
  backloadDestinations,
  backloadCargoTypes,
  originDefaults,
  destinationDefaults,
  cargoLabels,
  statusLabels,
};