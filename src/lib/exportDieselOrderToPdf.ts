import type { DieselOrder } from "@/hooks/useDieselOrders";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";

// Status labels
const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export function exportDieselOrderToPdf(order: DieselOrder): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const headerBg: [number, number, number] = [241, 245, 249]; // Light gray
  const _successColor: [number, number, number] = [34, 197, 94]; // Green
  const _warningColor: [number, number, number] = [234, 179, 8]; // Yellow/Orange

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

  // ========== HEADER ==========
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("DIESEL ORDER", margin, 18);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(order.order_number, margin, 28);

  // Status badge
  const statusText = statusLabels[order.status] || order.status;
  const statusWidth = doc.getTextWidth(statusText) + 10;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(
    pageWidth - margin - statusWidth,
    15,
    statusWidth,
    12,
    2,
    2,
    "F",
  );
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.text(statusText.toUpperCase(), pageWidth - margin - statusWidth / 2, 22, {
    align: "center",
  });

  yPos = 45;

  // ========== ORDER DETAILS ==========
  yPos = addSectionHeader("Order Information");

  doc.setFillColor(...headerBg);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 30, "F");
  yPos += 6;

  yPos = addKeyValue("Order Number:", order.order_number, yPos);
  yPos = addKeyValue("Fuel Station:", order.fuel_station, yPos);
  yPos = addKeyValue(
    "Quantity:",
    `${order.quantity_liters.toLocaleString()} Liters`,
    yPos,
  );
  yPos = addKeyValue(
    "Date Created:",
    format(parseISO(order.created_at), "dd MMM yyyy, HH:mm"),
    yPos,
  );

  yPos += 8;

  // ========== TRIP DETAILS ==========
  if (order.load) {
    yPos = addSectionHeader("Trip Information");

    doc.setFillColor(...headerBg);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 48, "F");
    yPos += 6;

    yPos = addKeyValue("Trip ID:", order.load.load_id, yPos);
    yPos = addKeyValue("Origin:", order.load.origin, yPos);
    yPos = addKeyValue("Destination:", order.load.destination, yPos);
    yPos = addKeyValue(
      "Loading Date:",
      format(parseISO(order.load.loading_date), "dd MMM yyyy"),
      yPos,
    );
    yPos = addKeyValue(
      "Offloading Date:",
      format(parseISO(order.load.offloading_date), "dd MMM yyyy"),
      yPos,
    );

    // Driver info
    if (order.load.driver) {
      yPos = addKeyValue("Driver:", order.load.driver.name, yPos);
      yPos = addKeyValue("Driver Contact:", order.load.driver.contact, yPos);
    }

    // Vehicle info
    if (order.load.fleet_vehicle) {
      yPos = addKeyValue(
        "Vehicle:",
        `${order.load.fleet_vehicle.vehicle_id} (${order.load.fleet_vehicle.type})`,
        yPos,
      );
    }

    yPos += 8;
  }

  // ========== RECIPIENT & VEHICLE DETAILS ==========
  // Use order's driver/fleet_vehicle if available, otherwise fall back to load's data
  const driverName =
    order.driver?.name || order.recipient_name || order.load?.driver?.name;
  const driverContact =
    order.driver?.contact ||
    order.recipient_phone ||
    order.load?.driver?.contact;
  const fleetVehicle = order.fleet_vehicle || order.load?.fleet_vehicle;

  if (driverName || driverContact || fleetVehicle) {
    yPos = addSectionHeader("Recipient & Vehicle Information");

    const boxHeight =
      (driverName ? 6 : 0) +
      (driverContact ? 6 : 0) +
      (fleetVehicle ? 6 : 0) +
      6;
    doc.setFillColor(...headerBg);
    doc.rect(margin, yPos, pageWidth - 2 * margin, boxHeight, "F");
    yPos += 6;

    if (driverName) {
      yPos = addKeyValue("Recipient Name:", driverName, yPos);
    }
    if (driverContact) {
      yPos = addKeyValue("Recipient Phone:", driverContact, yPos);
    }
    if (fleetVehicle) {
      yPos = addKeyValue(
        "Fleet Number:",
        `${fleetVehicle.vehicle_id} (${fleetVehicle.type})`,
        yPos,
      );
    }

    yPos += 8;
  }

  // ========== NOTES ==========
  if (order.notes) {
    yPos = addSectionHeader("Notes");

    doc.setFillColor(...headerBg);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 20, "F");
    yPos += 8;

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const splitNotes = doc.splitTextToSize(
      order.notes,
      pageWidth - 2 * margin - 8,
    );
    doc.text(splitNotes, margin + 4, yPos);
    yPos += splitNotes.length * 5 + 8;
  }

  // ========== AUTHORIZATION BOX ==========
  yPos += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("FUEL STATION AUTHORIZATION", margin + 4, yPos + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `This authorizes the release of ${order.quantity_liters.toLocaleString()} liters of diesel`,
    margin + 4,
    yPos + 18,
  );
  doc.text(`to the above-mentioned vehicle/driver.`, margin + 4, yPos + 24);

  // Signature lines
  doc.setFontSize(8);
  doc.text("Authorized Signature:", margin + 4, yPos + 38);
  doc.line(margin + 40, yPos + 38, margin + 80, yPos + 38);

  doc.text("Date:", margin + 90, yPos + 38);
  doc.line(margin + 100, yPos + 38, margin + 130, yPos + 38);

  doc.text("Station Stamp:", pageWidth - margin - 40, yPos + 38);

  // ========== FOOTER ==========
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`,
    margin,
    footerY,
  );
  doc.text("LoadPlan Fleet Management System", pageWidth - margin, footerY, {
    align: "right",
  });

  // Save PDF
  doc.save(`Diesel_Order_${order.order_number}.pdf`);
}

/**
 * Get status emoji for diesel order
 */
function getOrderStatusEmoji(status: string): string {
  switch (status) {
    case 'confirmed': return '✅';
    case 'pending': return '⏳';
    case 'fueled': return '⛽';
    case 'cancelled': return '❌';
    default: return '📋';
  }
}

/**
 * Generate professional WhatsApp message for diesel order
 * Returns formatted text without cost information
 */
export function generateDieselOrderWhatsAppMessage(order: DieselOrder): string {
  // Use order's driver/fleet_vehicle if available, otherwise fall back to load's data
  const driverName =
    order.driver?.name || order.recipient_name || order.load?.driver?.name;
  const driverContact =
    order.driver?.contact ||
    order.recipient_phone ||
    order.load?.driver?.contact;
  const fleetVehicle = order.fleet_vehicle || order.load?.fleet_vehicle;
  const statusEmoji = getOrderStatusEmoji(order.status);

  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━',
    '   ⛽ *DIESEL AUTHORIZATION*',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `${statusEmoji} *Status:* ${(statusLabels[order.status] || order.status).toUpperCase()}`,
    '',
    '🛢️ *FUEL DETAILS*',
    '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
    `📄 Order: \`${order.order_number}\``,
    `⛽ Station: ${order.fuel_station}`,
    `📊 Quantity: *${order.quantity_liters.toLocaleString()} Liters*`,
    '',
  ];

  // Add recipient and vehicle info
  if (driverName || fleetVehicle) {
    lines.push('🚛 *RECIPIENT & VEHICLE*');
    lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
    if (driverName) {
      lines.push(`👤 Driver: ${driverName}`);
    }
    if (driverContact) {
      lines.push(`📞 Contact: ${driverContact}`);
    }
    if (fleetVehicle) {
      lines.push(`🚚 Fleet: ${fleetVehicle.vehicle_id}${fleetVehicle.type ? ` (${fleetVehicle.type})` : ''}`);
    }
    lines.push('');
  }

  if (order.load) {
    lines.push('📍 *TRIP INFORMATION*');
    lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
    lines.push(`📦 Load: ${order.load.load_id}`);
    lines.push(`🛣️ Route: ${order.load.origin} → ${order.load.destination}`);
    lines.push(`📅 Loading: ${format(parseISO(order.load.loading_date), "dd MMM yyyy")}`);
    lines.push('');
  }

  if (order.notes) {
    lines.push('📝 *NOTES*');
    lines.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄');
    lines.push(order.notes);
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(`🕐 Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`);
  lines.push('');
  lines.push('_Powered by LoadPlan™_');

  return lines.join("\n");
}

/**
 * Open WhatsApp with pre-filled message
 */
export function shareViaWhatsApp(
  order: DieselOrder,
  phoneNumber?: string,
): void {
  const message = generateDieselOrderWhatsAppMessage(order);
  const encodedMessage = encodeURIComponent(message);

  let whatsappUrl = `https://wa.me/`;

  // If phone number is provided, add it to the URL
  if (phoneNumber) {
    // Remove any non-digit characters except +
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, "");
    whatsappUrl += cleanedNumber;
  }

  whatsappUrl += `?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank");
}