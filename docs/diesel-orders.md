# Diesel Orders

This guide covers creating and managing diesel orders for fleet trips in LoadPlan.

## Overview

The Diesel Orders module allows you to:

- Create diesel authorization orders
- Link orders to loads and trips
- Track order status
- Print/export order documents
- Share orders via WhatsApp

---

## Accessing Diesel Orders

Click **Diesel Orders** in the sidebar navigation.

---

## Dashboard Overview

The Diesel Orders page shows:

### Statistics Cards

| Stat                 | Description                 |
| -------------------- | --------------------------- |
| **Total Orders**     | All orders in system        |
| **Pending**          | Orders awaiting fulfillment |
| **Total Liters**     | Sum of all order quantities |
| **Fulfilled Liters** | Completed order quantities  |

### Orders Table

All orders with filtering and search capabilities.

---

## Creating a Diesel Order

### Step 1: Click "+ Create Order"

Opens the create order dialog.

### Step 2: Enter Order Details

#### Order Information

| Field                 | Description                           | Required |
| --------------------- | ------------------------------------- | -------- |
| **Fuel Station**      | Station name where fuel is authorized | Yes      |
| **Quantity (Liters)** | Amount of diesel authorized           | Yes      |
| **Notes**             | Special instructions                  | No       |

#### Link to Load (Optional)

Associate the order with a specific load:

1. Select load from dropdown
2. Auto-fills driver and vehicle info
3. Links order to trip for reporting

#### Recipient Details

If not linking to load, enter manually:

| Field               | Description                   |
| ------------------- | ----------------------------- |
| **Driver**          | Select driver receiving fuel  |
| **Fleet Vehicle**   | Select vehicle being fueled   |
| **Recipient Name**  | Manual entry if not in system |
| **Recipient Phone** | Contact number                |

### Step 3: Save

Click **Create Order** to save.

---

## Order Number Format

Orders are automatically assigned numbers:

```
DO-YYYYMMDD-NNNN
```

Example: `DO-20260203-0001`

---

## Order Status Workflow

Orders progress through these statuses:

```
Pending → Approved → Fulfilled
              ↓
          Cancelled
```

| Status        | Description                | Color  |
| ------------- | -------------------------- | ------ |
| **Pending**   | Created, awaiting approval | Yellow |
| **Approved**  | Authorized for fulfillment | Blue   |
| **Fulfilled** | Fuel dispensed             | Green  |
| **Cancelled** | Order cancelled            | Red    |

---

## Filtering Orders

### Search

Search orders by:

- Order number
- Fuel station name
- Load ID
- Recipient name

### Status Filter

Filter by status:

- All
- Pending
- Approved
- Fulfilled
- Cancelled

---

## Editing an Order

1. Click on any order row
2. Edit Order dialog opens
3. Modify fields:
   - Quantity
   - Fuel station
   - Status
   - Notes
4. Click **Save Changes**

---

## Exporting an Order

### PDF Export

Generate a printable authorization document:

1. Click the **⋮** menu on an order row
2. Select **Export PDF**
3. PDF downloads with:
   - Order details
   - Authorization section
   - Signature lines
   - Company branding

The PDF includes:

- Order number and date
- Fuel station and quantity
- Trip information (if linked)
- Driver and vehicle details
- Authorization section for station use

### Use Case

Print the PDF and give it to:

- The driver to present at fuel station
- Fuel station as authorization proof

---

## Sharing via WhatsApp

Send order details to drivers or stations:

1. Click the **⋮** menu on an order row
2. Select **Share via WhatsApp**
3. Choose optional phone number
4. WhatsApp opens with formatted message

### Message Format

The WhatsApp message includes:

```
━━━━━━━━━━━━━━━━━━━━━━
   ⛽ DIESEL AUTHORIZATION
━━━━━━━━━━━━━━━━━━━━━━

✅ Status: PENDING

🛢️ FUEL DETAILS
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
📄 Order: DO-20260203-0001
⛽ Station: Shell Main Street
📊 Quantity: 500 Liters

🚛 RECIPIENT & VEHICLE
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
👤 Driver: John Smith
📞 Contact: +263 77 123 4567
🚚 Fleet: FLT-001 (Rigid)

📍 TRIP INFORMATION
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
📦 Load: LD-2026-0001
🛣️ Route: BV → Bulawayo Depot

━━━━━━━━━━━━━━━━━━━━━━
🕐 Generated: 03 Feb 2026, 14:30

Powered by LoadPlan™
```

---

## Deleting an Order

1. Click the **⋮** menu on an order row
2. Select **Delete**
3. Confirm deletion

> **Note:** Consider cancelling instead of deleting for audit trail.

---

## Linking Orders to Loads

### Benefits of Linking

- Automatic driver/vehicle population
- Trip context in reports
- Better cost tracking
- Fuel expense per route analysis

### How to Link

When creating an order:

1. Select from "Link to Load" dropdown
2. Shows recent loads with driver/vehicle
3. Selection auto-fills recipient details

---

## Best Practices

### Order Creation

1. **Link to loads** - Associate orders with trips when possible
2. **Accurate quantities** - Enter actual authorized amounts
3. **Clear station names** - Use consistent fuel station naming
4. **Add notes** - Include special instructions if needed

### Fulfillment Tracking

1. **Update status** - Change to Fulfilled when complete
2. **Timely updates** - Update status same day
3. **Track refusals** - Use Cancelled for rejected orders

### Documentation

1. **Print copies** - Give drivers printed authorization
2. **Keep records** - Maintain order history
3. **Reconcile** - Compare orders with fuel receipts

---

## Reports

### Diesel Reports

View diesel consumption reports:

1. Go to **Reports**
2. Select diesel-related metrics
3. Filter by date range

### Metrics Available

- Total liters authorized
- Total liters fulfilled
- Orders by status
- Consumption by route
- Consumption by vehicle

---

## Troubleshooting

### Order Not Linked to Load

If load doesn't appear in dropdown:

1. Verify load exists
2. Check load has driver/vehicle assigned
3. Refresh the page

### PDF Not Downloading

If PDF export fails:

1. Check browser popup blocker
2. Try different browser
3. Contact support if persistent

### WhatsApp Not Opening

If WhatsApp share fails:

1. Ensure WhatsApp is installed (mobile)
2. Try WhatsApp Web (desktop)
3. Copy message manually if needed

---

## Related Guides

- [Load Management →](./load-management.md)
- [Fleet Management →](./fleet-management.md)
- [Driver Management →](./driver-management.md)
