import { format } from "date-fns";
import * as XLSX from "xlsx";
import type { ExpiryAlert, MissingDocument } from "@/hooks/useExpiryAlerts";

interface ExportOptions {
  filename?: string;
}

export function exportExpiryAlertsToExcel(
  alerts: ExpiryAlert[],
  options: ExportOptions = {},
): void {
  const { filename = `expiry-alerts-${format(new Date(), "yyyy-MM-dd")}` } =
    options;

  // Separate alerts by type
  const driverAlerts = alerts.filter((a) => a.type === "driver");
  const vehicleAlerts = alerts.filter((a) => a.type === "vehicle");

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    { Category: "Total Alerts", Count: alerts.length },
    { Category: "", Count: "" },
    {
      Category: "Expired Documents",
      Count: alerts.filter((a) => a.status === "expired").length,
    },
    {
      Category: "Critical (≤7 days)",
      Count: alerts.filter((a) => a.status === "critical").length,
    },
    {
      Category: "Warning (≤20 days)",
      Count: alerts.filter((a) => a.status === "warning").length,
    },
    { Category: "", Count: "" },
    { Category: "Driver Documents", Count: driverAlerts.length },
    { Category: "Vehicle Documents", Count: vehicleAlerts.length },
    { Category: "", Count: "" },
    {
      Category: "Report Generated",
      Count: format(new Date(), "dd/MM/yyyy HH:mm"),
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Driver Documents sheet
  if (driverAlerts.length > 0) {
    const driverData = driverAlerts.map((alert) => ({
      "Driver Name": alert.entityName,
      "Document Type": alert.documentLabel,
      "Expiry Date": format(new Date(alert.expiryDate), "dd/MM/yyyy"),
      "Days Until Expiry":
        alert.daysUntilExpiry < 0
          ? `${Math.abs(alert.daysUntilExpiry)} days overdue`
          : `${alert.daysUntilExpiry} days`,
      Status:
        alert.status === "expired"
          ? "EXPIRED"
          : alert.status === "critical"
            ? "CRITICAL"
            : "WARNING",
    }));

    const driverSheet = XLSX.utils.json_to_sheet(driverData);
    driverSheet["!cols"] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, driverSheet, "Driver Documents");
  }

  // Vehicle Documents sheet
  if (vehicleAlerts.length > 0) {
    const vehicleData = vehicleAlerts.map((alert) => ({
      "Vehicle ID": alert.entityName,
      "Document Type": alert.documentLabel,
      "Expiry Date": format(new Date(alert.expiryDate), "dd/MM/yyyy"),
      "Days Until Expiry":
        alert.daysUntilExpiry < 0
          ? `${Math.abs(alert.daysUntilExpiry)} days overdue`
          : `${alert.daysUntilExpiry} days`,
      Status:
        alert.status === "expired"
          ? "EXPIRED"
          : alert.status === "critical"
            ? "CRITICAL"
            : "WARNING",
    }));

    const vehicleSheet = XLSX.utils.json_to_sheet(vehicleData);
    vehicleSheet["!cols"] = [
      { wch: 15 },
      { wch: 22 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, vehicleSheet, "Vehicle Documents");
  }

  // Generate and download the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export only driver documents
export function exportDriverExpiryAlertsToExcel(
  alerts: ExpiryAlert[],
  options: ExportOptions = {},
): void {
  const driverAlerts = alerts.filter((a) => a.type === "driver");
  exportExpiryAlertsToExcel(driverAlerts, {
    filename:
      options.filename ||
      `driver-expiry-alerts-${format(new Date(), "yyyy-MM-dd")}`,
  });
}

// Export only vehicle documents
export function exportVehicleExpiryAlertsToExcel(
  alerts: ExpiryAlert[],
  options: ExportOptions = {},
): void {
  const vehicleAlerts = alerts.filter((a) => a.type === "vehicle");
  exportExpiryAlertsToExcel(vehicleAlerts, {
    filename:
      options.filename ||
      `vehicle-expiry-alerts-${format(new Date(), "yyyy-MM-dd")}`,
  });
}

// Export missing documents report
export function exportMissingDocumentsToExcel(
  missingDocs: MissingDocument[],
  options: ExportOptions = {},
): void {
  const { filename = `missing-documents-${format(new Date(), "yyyy-MM-dd")}` } =
    options;

  // Separate by type
  const driverMissing = missingDocs.filter((m) => m.type === "driver");
  const vehicleMissing = missingDocs.filter((m) => m.type === "vehicle");
  const missingDates = missingDocs.filter((m) => m.missingType === "no_date");
  const missingUploads = missingDocs.filter(
    (m) => m.missingType === "no_document",
  );

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    { Category: "Total Missing Items", Count: missingDocs.length },
    { Category: "", Count: "" },
    { Category: "Missing Expiry Dates", Count: missingDates.length },
    { Category: "Missing Document Uploads", Count: missingUploads.length },
    { Category: "", Count: "" },
    { Category: "Driver Documents", Count: driverMissing.length },
    { Category: "Vehicle Documents", Count: vehicleMissing.length },
    { Category: "", Count: "" },
    {
      Category: "Report Generated",
      Count: format(new Date(), "dd/MM/yyyy HH:mm"),
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Driver Missing Documents sheet
  if (driverMissing.length > 0) {
    const driverData = driverMissing.map((doc) => ({
      "Driver Name": doc.entityName,
      "Document Type": doc.documentLabel,
      Issue:
        doc.missingType === "no_document"
          ? "Document not uploaded"
          : "Expiry date not set",
      "Issue Type": doc.missingType === "no_document" ? "NO FILE" : "NO DATE",
    }));

    const driverSheet = XLSX.utils.json_to_sheet(driverData);
    driverSheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, driverSheet, "Driver Missing");
  }

  // Vehicle Missing Documents sheet
  if (vehicleMissing.length > 0) {
    const vehicleData = vehicleMissing.map((doc) => ({
      "Vehicle ID": doc.entityName,
      "Document Type": doc.documentLabel,
      Issue:
        doc.missingType === "no_document"
          ? "Document not uploaded"
          : "Expiry date not set",
      "Issue Type": doc.missingType === "no_document" ? "NO FILE" : "NO DATE",
    }));

    const vehicleSheet = XLSX.utils.json_to_sheet(vehicleData);
    vehicleSheet["!cols"] = [
      { wch: 15 },
      { wch: 22 },
      { wch: 25 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, vehicleSheet, "Vehicle Missing");
  }

  // Generate and download the file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}