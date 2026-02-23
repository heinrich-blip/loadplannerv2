import type { Driver } from "@/hooks/useDrivers";
import { useDrivers } from "@/hooks/useDrivers";
import type { FleetVehicle } from "@/hooks/useFleetVehicles";
import { useFleetVehicles } from "@/hooks/useFleetVehicles";
import { differenceInDays, isValid, parseISO } from "date-fns";
import { useMemo } from "react";

export interface ExpiryAlert {
  id: string;
  type: "driver" | "vehicle";
  entityName: string;
  entityId: string;
  documentType: string;
  documentLabel: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: "expired" | "critical" | "warning" | "upcoming";
}

export interface MissingDocument {
  id: string;
  type: "driver" | "vehicle";
  entityName: string;
  entityId: string;
  documentType: string;
  documentLabel: string;
  missingType: "no_date" | "no_document";
}

// Document type labels
const driverDocumentLabels: Record<string, string> = {
  passport_expiry: "Passport",
  drivers_license_expiry: "Driver's License",
  retest_certificate_expiry: "Retest Certificate",
  medical_certificate_expiry: "Medical Certificate",
  international_driving_permit_expiry: "International Driving Permit",
  defensive_driving_permit_expiry: "Defensive Driving Permit",
};

const vehicleDocumentLabels: Record<string, string> = {
  license_expiry: "Vehicle License",
  cof_expiry: "Certificate of Fitness",
  radio_license_expiry: "Radio License",
  insurance_expiry: "Insurance",
  svg_expiry: "SVG Certificate",
};

function calculateDaysUntilExpiry(
  expiryDateStr: string | null | undefined,
): number | null {
  if (!expiryDateStr) return null;

  try {
    const expiryDate = parseISO(expiryDateStr);
    if (!isValid(expiryDate)) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return differenceInDays(expiryDate, today);
  } catch {
    return null;
  }
}

function getExpiryStatus(daysUntilExpiry: number): ExpiryAlert["status"] {
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 7) return "critical";
  if (daysUntilExpiry <= 20) return "warning";
  return "upcoming";
}

function processDriverExpiryDates(driver: Driver): {
  alerts: ExpiryAlert[];
  missing: MissingDocument[];
} {
  const alerts: ExpiryAlert[] = [];
  const missing: MissingDocument[] = [];

  const expiryFields = [
    {
      field: "passport_expiry",
      value: driver.passport_expiry,
    },
    {
      field: "drivers_license_expiry",
      value: driver.drivers_license_expiry,
    },
    {
      field: "retest_certificate_expiry",
      value: driver.retest_certificate_expiry,
    },
    {
      field: "medical_certificate_expiry",
      value: driver.medical_certificate_expiry,
    },
    {
      field: "international_driving_permit_expiry",
      value: driver.international_driving_permit_expiry,
    },
    {
      field: "defensive_driving_permit_expiry",
      value: driver.defensive_driving_permit_expiry,
    },
  ];

  for (const { field, value } of expiryFields) {
    // Skip if marked as N/A (sentinel date 9999-12-31)
    if (value && value.startsWith("9999-12-31")) {
      continue;
    }

    // Alert for missing expiry date (only if not N/A)
    if (!value) {
      missing.push({
        id: `${driver.id}-${field}-nodate`,
        type: "driver",
        entityName: driver.name,
        entityId: driver.id,
        documentType: field,
        documentLabel: driverDocumentLabels[field] || field,
        missingType: "no_date",
      });
      continue;
    }

    const daysUntilExpiry = calculateDaysUntilExpiry(value);

    if (daysUntilExpiry !== null && daysUntilExpiry <= 20) {
      alerts.push({
        id: `${driver.id}-${field}`,
        type: "driver",
        entityName: driver.name,
        entityId: driver.id,
        documentType: field,
        documentLabel: driverDocumentLabels[field] || field,
        expiryDate: value!,
        daysUntilExpiry,
        status: getExpiryStatus(daysUntilExpiry),
      });
    }
  }

  return { alerts, missing };
}

function processVehicleExpiryDates(vehicle: FleetVehicle): {
  alerts: ExpiryAlert[];
  missing: MissingDocument[];
} {
  const alerts: ExpiryAlert[] = [];
  const missing: MissingDocument[] = [];

  const expiryFields = [
    { field: "license_expiry", value: vehicle.license_expiry, active: vehicle.license_active },
    { field: "cof_expiry", value: vehicle.cof_expiry, active: vehicle.cof_active },
    { field: "radio_license_expiry", value: vehicle.radio_license_expiry, active: vehicle.radio_license_active },
    { field: "insurance_expiry", value: vehicle.insurance_expiry, active: vehicle.insurance_active },
    { field: "svg_expiry", value: vehicle.svg_expiry, active: vehicle.svg_active },
  ];

  for (const { field, value, active } of expiryFields) {
    // Skip if marked as N/A (sentinel date 9999-12-31)
    if (value && value.startsWith("9999-12-31")) {
      continue;
    }

    // Skip if the document is not active (deactivated)
    // Default to true if active field is undefined (for backwards compatibility)
    if (active === false) {
      continue;
    }

    // Alert for missing expiry date
    if (!value) {
      missing.push({
        id: `${vehicle.id}-${field}-nodate`,
        type: "vehicle",
        entityName: vehicle.vehicle_id,
        entityId: vehicle.id,
        documentType: field,
        documentLabel: vehicleDocumentLabels[field] || field,
        missingType: "no_date",
      });
      continue;
    }

    const daysUntilExpiry = calculateDaysUntilExpiry(value);

    if (daysUntilExpiry !== null && daysUntilExpiry <= 20) {
      alerts.push({
        id: `${vehicle.id}-${field}`,
        type: "vehicle",
        entityName: vehicle.vehicle_id,
        entityId: vehicle.id,
        documentType: field,
        documentLabel: vehicleDocumentLabels[field] || field,
        expiryDate: value!,
        daysUntilExpiry,
        status: getExpiryStatus(daysUntilExpiry),
      });
    }
  }

  return { alerts, missing };
}

export function useExpiryAlerts() {
  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: vehicles = [], isLoading: vehiclesLoading } =
    useFleetVehicles();

  const { alerts, missingDocuments } = useMemo(() => {
    const allAlerts: ExpiryAlert[] = [];
    const allMissing: MissingDocument[] = [];

    // Process driver documents
    for (const driver of drivers) {
      const result = processDriverExpiryDates(driver);
      allAlerts.push(...result.alerts);
      allMissing.push(...result.missing);
    }

    // Process vehicle documents
    for (const vehicle of vehicles) {
      const result = processVehicleExpiryDates(vehicle);
      allAlerts.push(...result.alerts);
      allMissing.push(...result.missing);
    }

    // Sort alerts by days until expiry (expired first, then by urgency)
    const sortedAlerts = allAlerts.sort(
      (a, b) => a.daysUntilExpiry - b.daysUntilExpiry,
    );

    return { alerts: sortedAlerts, missingDocuments: allMissing };
  }, [drivers, vehicles]);

  const expiredAlerts = useMemo(
    () => alerts.filter((a) => a.status === "expired"),
    [alerts],
  );

  const criticalAlerts = useMemo(
    () => alerts.filter((a) => a.status === "critical"),
    [alerts],
  );

  const warningAlerts = useMemo(
    () => alerts.filter((a) => a.status === "warning"),
    [alerts],
  );

  const driverAlerts = useMemo(
    () => alerts.filter((a) => a.type === "driver"),
    [alerts],
  );

  const vehicleAlerts = useMemo(
    () => alerts.filter((a) => a.type === "vehicle"),
    [alerts],
  );

  const missingDriverDocs = useMemo(
    () => missingDocuments.filter((m) => m.type === "driver"),
    [missingDocuments],
  );

  const missingVehicleDocs = useMemo(
    () => missingDocuments.filter((m) => m.type === "vehicle"),
    [missingDocuments],
  );

  const missingDates = useMemo(
    () => missingDocuments.filter((m) => m.missingType === "no_date"),
    [missingDocuments],
  );

  const missingUploads = useMemo(
    () => missingDocuments.filter((m) => m.missingType === "no_document"),
    [missingDocuments],
  );

  return {
    alerts,
    missingDocuments,
    expiredAlerts,
    criticalAlerts,
    warningAlerts,
    driverAlerts,
    vehicleAlerts,
    missingDriverDocs,
    missingVehicleDocs,
    missingDates,
    missingUploads,
    totalCount: alerts.length,
    expiredCount: expiredAlerts.length,
    criticalCount: criticalAlerts.length,
    missingCount: missingDocuments.length,
    isLoading: driversLoading || vehiclesLoading,
  };
}