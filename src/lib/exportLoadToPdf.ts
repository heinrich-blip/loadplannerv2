import type { Load } from "@/hooks/useLoads";
import * as timeWindowLib from "@/lib/timeWindow";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Status labels
const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Cargo type labels
const cargoLabels: Record<string, string> = {
  VanSalesRetail: "Van Sales/Retail",
  Retail: "Retail",
  Vendor: "Vendor",
  RetailVendor: "Retail Vendor",
  Fertilizer: "Fertilizer",
  BV: "BV (Backload)",
  CBC: "CBC (Backload)",
  Packaging: "Packaging (Backload)",
};

// Check if a load is a backload for another load
function findBackload(load: Load, allLoads: Load[]): Load | undefined {
  // Backloads have IDs starting with BL- followed by the original load ID
  const originalLoadIdPart = load.load_id.replace(/^LD-/, "");
  return allLoads.find(
    (l) => l.load_id.startsWith(`BL-${originalLoadIdPart}`) && l.id !== load.id,
  );
}

// Find parent load if this is a backload
function findParentLoad(load: Load, allLoads: Load[]): Load | undefined {
  if (!load.load_id.startsWith("BL-")) return undefined;

  // Extract original load ID from backload ID (BL-{originalId}-{timestamp})
  const parts = load.load_id.split("-");
  if (parts.length >= 2) {
    const originalIdPart = parts[1];
    return allLoads.find((l) => l.load_id === `LD-${originalIdPart}`);
  }
  return undefined;
}

export function exportLoadToPdf(load: Load, allLoads: Load[]): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const headerBg: [number, number, number] = [241, 245, 249]; // Light gray
  const successColor: [number, number, number] = [34, 197, 94]; // Green
  const warningColor: [number, number, number] = [234, 179, 8]; // Yellow/Orange

  // Helper to add section header
  const addSectionHeader = (
    title: string,
    color: [number, number, number] = primaryColor,
  ): number => {
    doc.setFillColor(...color);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 4, yPos + 5.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    return yPos + 12;
  };

  // Helper to add key-value row
  const addKeyValue = (
    key: string,
    value: string,
    y: number,
    width = 60,
  ): number => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(key, margin + 4, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(value || "-", margin + width, y);
    return y + 6;
  };

  const timeWindow = timeWindowLib.parseTimeWindow(load.time_window);

  // ========== HEADER ==========
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("LOAD REPORT", margin, 18);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(load.load_id, margin, 28);

  // Status badge
  const statusText = statusLabels[load.status] || load.status;
  const statusWidth = doc.getTextWidth(statusText) + 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(
    pageWidth - margin - statusWidth,
    12,
    statusWidth,
    10,
    2,
    2,
    "F",
  );
  doc.setTextColor(
    ...(load.status === "delivered" ? successColor : primaryColor),
  );
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageWidth - margin - statusWidth + 5, 19);

  // Generated date
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
    pageWidth - margin - 55,
    28,
  );

  yPos = 45;
  doc.setTextColor(0, 0, 0);

  // ========== LOAD DETAILS ==========
  yPos = addSectionHeader("Load Details");

  // Two columns
  const _col1X = margin;
  const col2X = pageWidth / 2 + 5;
  let col1Y = yPos;
  let col2Y = yPos;

  // Column 1
  col1Y = addKeyValue("Load ID:", load.load_id, col1Y);
  col1Y = addKeyValue(
    "Cargo Type:",
    cargoLabels[load.cargo_type] || load.cargo_type,
    col1Y,
  );
  col1Y = addKeyValue("Quantity:", `${load.quantity} units`, col1Y);
  col1Y = addKeyValue("Weight:", `${load.weight} T`, col1Y);

  // Column 2
  doc.setFontSize(9);
  const addKeyValueCol2 = (key: string, value: string): void => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(key, col2X, col2Y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(value || "-", col2X + 55, col2Y);
    col2Y += 6;
  };

  addKeyValueCol2(
    "Loading Date:",
    format(parseISO(load.loading_date), "dd MMM yyyy"),
  );
  addKeyValueCol2(
    "Offloading Date:",
    format(parseISO(load.offloading_date), "dd MMM yyyy"),
  );
  addKeyValueCol2(
    "Created:",
    format(parseISO(load.created_at), "dd MMM yyyy HH:mm"),
  );
  addKeyValueCol2(
    "Last Updated:",
    format(parseISO(load.updated_at), "dd MMM yyyy HH:mm"),
  );

  yPos = Math.max(col1Y, col2Y) + 4;

  // Special Handling
  if (load.special_handling && load.special_handling.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("Special Handling:", margin + 4, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(load.special_handling.join(", "), margin + 60, yPos);
    yPos += 8;
  }

  // ========== ROUTE ==========
  yPos = addSectionHeader("Route Information");

  // Origin
  doc.setFillColor(...headerBg);
  doc.rect(margin, yPos, (pageWidth - 2 * margin) / 2 - 5, 35, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...successColor);
  doc.text("ORIGIN", margin + 4, yPos + 6);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(load.origin, margin + 4, yPos + 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Planned Arr: ${timeWindow.origin.plannedArrival}`,
    margin + 4,
    yPos + 22,
  );
  doc.text(
    `Planned Dep: ${timeWindow.origin.plannedDeparture}`,
    margin + 4,
    yPos + 28,
  );

  // Destination
  const destX = margin + (pageWidth - 2 * margin) / 2 + 5;
  doc.setFillColor(...headerBg);
  doc.rect(destX, yPos, (pageWidth - 2 * margin) / 2 - 5, 35, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("DESTINATION", destX + 4, yPos + 6);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(load.destination, destX + 4, yPos + 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Planned Arr: ${timeWindow.destination.plannedArrival}`,
    destX + 4,
    yPos + 22,
  );
  doc.text(
    `Planned Dep: ${timeWindow.destination.plannedDeparture}`,
    destX + 4,
    yPos + 28,
  );

  // Arrow between origin and destination
  doc.setFillColor(...primaryColor);
  const arrowX = margin + (pageWidth - 2 * margin) / 2 - 3;
  doc.triangle(
    arrowX,
    yPos + 17,
    arrowX + 6,
    yPos + 17,
    arrowX + 3,
    yPos + 14,
    "F",
  );
  doc.rect(arrowX + 1, yPos + 17, 4, 6, "F");

  yPos += 42;

  // ========== ACTUAL TIMES (if any exist) ==========
  const hasActualTimes =
    timeWindow.origin.actualArrival !== "" ||
    timeWindow.origin.actualDeparture !== "" ||
    timeWindow.destination.actualArrival !== "" ||
    timeWindow.destination.actualDeparture !== "";

  if (hasActualTimes) {
    yPos = addSectionHeader("Actual Times", successColor);

    autoTable(doc, {
      startY: yPos,
      head: [["Location", "Actual Arrival", "Actual Departure"]],
      body: [
        [
          "Origin (" + load.origin + ")",
          timeWindow.origin.actualArrival ?? "",
          timeWindow.origin.actualDeparture ?? "",
        ],
        [
          "Destination (" + load.destination + ")",
          timeWindow.destination.actualArrival ?? "",
          timeWindow.destination.actualDeparture ?? "",
        ],
      ],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: successColor, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    yPos =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;
  }

  // ========== ASSIGNMENT ==========
  yPos = addSectionHeader("Assignment Details");

  // Vehicle
  doc.setFontSize(9);
  yPos = addKeyValue(
    "Vehicle ID:",
    load.fleet_vehicle?.vehicle_id || "Unassigned",
    yPos,
  );
  yPos = addKeyValue("Vehicle Type:", load.fleet_vehicle?.type || "-", yPos);
  yPos = addKeyValue("Driver:", load.driver?.name || "Unassigned", yPos);
  yPos = addKeyValue("Driver Contact:", load.driver?.contact || "-", yPos);

  yPos += 4;

  // ========== NOTES ==========
  if (load.notes) {
    yPos = addSectionHeader("Notes");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    // Split notes into lines
    const splitNotes = doc.splitTextToSize(
      load.notes,
      pageWidth - 2 * margin - 8,
    );
    doc.text(splitNotes, margin + 4, yPos);
    yPos += splitNotes.length * 5 + 8;
  }

  // ========== PLANNED BACKLOAD SECTION (from time_window.backload) ==========
  if (timeWindow.backload?.enabled) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    yPos = addSectionHeader("Planned Backload", warningColor);

    const backloadData: string[][] = [
      ["Backload Destination", timeWindow.backload.destination],
      [
        "Cargo Type",
        cargoLabels[timeWindow.backload.cargoType] ||
          timeWindow.backload.cargoType,
      ],
      ["Offloading Date", timeWindow.backload.offloadingDate],
    ];

    // Add quantities if present
    if (timeWindow.backload.quantities) {
      const { bins, crates, pallets } = timeWindow.backload.quantities;
      const quantityParts: string[] = [];
      if (bins > 0) quantityParts.push(`${bins} bins`);
      if (crates > 0) quantityParts.push(`${crates} crates`);
      if (pallets > 0) quantityParts.push(`${pallets} pallets`);
      if (quantityParts.length > 0) {
        backloadData.push(["Quantities", quantityParts.join(", ")]);
      }
    }

    // Add backload notes if present
    if (timeWindow.backload.notes) {
      backloadData.push(["Notes", timeWindow.backload.notes]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [["Field", "Value"]],
      body: backloadData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: warningColor, textColor: [0, 0, 0] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [255, 251, 235] },
    });

    yPos =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;
  }

  // ========== BACKLOAD SECTION ==========
  const backload = findBackload(load, allLoads);
  const parentLoad = findParentLoad(load, allLoads);

  // If this load has a backload
  if (backload) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    yPos = addSectionHeader("Associated Backload", warningColor);

        const backloadTimeWindow = timeWindowLib.parseTimeWindow(backload.time_window);

    autoTable(doc, {
      startY: yPos,
      head: [["Field", "Value"]],
      body: [
        ["Backload ID", backload.load_id],
        ["Status", statusLabels[backload.status] || backload.status],
        ["Cargo Type", cargoLabels[backload.cargo_type] || backload.cargo_type],
        ["Origin", backload.origin],
        ["Destination", backload.destination],
        [
          "Loading Date",
          format(parseISO(backload.loading_date), "dd MMM yyyy"),
        ],
        [
          "Offloading Date",
          format(parseISO(backload.offloading_date), "dd MMM yyyy"),
        ],
        ["Quantity", `${backload.quantity} units`],
        ["Driver", backload.driver?.name || "Same as main load"],
        ["Vehicle", backload.fleet_vehicle?.vehicle_id || "Same as main load"],
      ],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: warningColor, textColor: [0, 0, 0] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [255, 251, 235] },
    });

    yPos =
      (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;

    // Backload times
    if (
      backloadTimeWindow.origin.plannedArrival !== "-" ||
      backloadTimeWindow.destination.plannedArrival !== "-"
    ) {
      autoTable(doc, {
        startY: yPos,
        head: [["Backload Location", "Planned Arrival", "Planned Departure"]],
        body: [
          [
            "Origin (" + backload.origin + ")",
            backloadTimeWindow.origin.plannedArrival ?? "",
            backloadTimeWindow.origin.plannedDeparture ?? "",
          ],
          [
            "Destination (" + backload.destination + ")",
            backloadTimeWindow.destination.plannedArrival ?? "",
            backloadTimeWindow.destination.plannedDeparture ?? "",
          ],
        ],
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: warningColor, textColor: [0, 0, 0] },
        alternateRowStyles: { fillColor: [255, 251, 235] },
      });

      yPos =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 8;
    }

    // Backload notes
    if (backload.notes) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("Backload Notes:", margin + 4, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      const splitBackloadNotes = doc.splitTextToSize(
        backload.notes,
        pageWidth - 2 * margin - 8,
      );
      doc.text(splitBackloadNotes, margin + 4, yPos + 5);
      yPos += splitBackloadNotes.length * 5 + 12;
    }
  }

  // If this is a backload, show parent load reference
  if (parentLoad) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    yPos = addSectionHeader("Parent Load Reference", primaryColor);

    autoTable(doc, {
      startY: yPos,
      head: [["Field", "Value"]],
      body: [
        ["Parent Load ID", parentLoad.load_id],
        ["Status", statusLabels[parentLoad.status] || parentLoad.status],
        ["Origin", parentLoad.origin],
        ["Destination", parentLoad.destination],
        [
          "Cargo Type",
          cargoLabels[parentLoad.cargo_type] || parentLoad.cargo_type,
        ],
        [
          "Loading Date",
          format(parseISO(parentLoad.loading_date), "dd MMM yyyy"),
        ],
        [
          "Offloading Date",
          format(parseISO(parentLoad.offloading_date), "dd MMM yyyy"),
        ],
      ],
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
    doc.text(
      "LoadFlow - Load Management System",
      margin,
      doc.internal.pageSize.getHeight() - 10,
    );
  }

  // Save the PDF
  doc.save(`${load.load_id}-report.pdf`);
}