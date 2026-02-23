# Load Management

This guide covers how to schedule, manage, and track loads in LoadPlan.

## Overview

The Load Planning module allows you to:

- Create and schedule new loads
- Assign vehicles and drivers
- Track load status throughout delivery
- Export load data to Excel
- Configure backloads for return trips

---

## Accessing Load Planning

1. Click **Load Planning** in the sidebar navigation
2. The page displays all loads with filtering options

---

## Creating a New Load

### Step 1: Open Create Dialog

Click the **+ Add Load** button in the top-right corner.

### Step 2: Fill Load Details

#### Basic Information

| Field               | Description                     | Required |
| ------------------- | ------------------------------- | -------- |
| **Priority**        | High, Medium, or Low            | Yes      |
| **Loading Date**    | Date when cargo is loaded       | Yes      |
| **Offloading Date** | Expected delivery date          | Yes      |
| **Origin**          | Loading location (BV, CBC)      | Yes      |
| **Destination**     | Delivery location               | Yes      |
| **Cargo Type**      | Type of cargo being transported | Yes      |

#### Cargo Types

- **VanSalesRetail** - Van sales retail delivery
- **Retail** - Retail outlet delivery
- **Vendor** - Vendor delivery
- **RetailVendor** - Combined retail and vendor
- **Fertilizer** - Fertilizer transport
- **Export** - International export loads

#### Destinations

**Local Destinations:**

- Bulawayo Depot
- Rezende Depot
- Mutare Depot

**Export Destinations:**

- Freshmark Centurion
- Freshmark Polokwane
- Fresh Approach CPT
- Fresh Approach PE
- Farmerstrust Market
- Dapper Market

### Step 3: Set Times

The system auto-fills default times based on origin/destination:

| Location       | Default Arrival | Default Departure |
| -------------- | --------------- | ----------------- |
| BV (Origin)    | 15:00           | 17:00             |
| CBC (Origin)   | 15:00           | 17:00             |
| Bulawayo Depot | 08:00           | 11:00             |
| Rezende Depot  | 05:00           | 07:00             |
| Mutare Depot   | 06:00           | 09:00             |

### Step 4: Assign Resources

| Field             | Description                         |
| ----------------- | ----------------------------------- |
| **Fleet Vehicle** | Select from available vehicles      |
| **Driver**        | Assign primary driver               |
| **Notes**         | Additional instructions or comments |

### Step 5: Configure Backload (Optional)

If the vehicle will carry return cargo:

1. Check **"Include Backload"**
2. Select backload destination (BV or CBC)
3. Choose cargo type (Packaging or Fertilizer)
4. Set backload offloading date
5. Enter quantities:
   - Bins
   - Crates
   - Pallets
6. Add any backload notes

### Step 6: Save

Click **Create Load** to save the new load.

---

## Load ID Format

Loads are automatically assigned IDs in the format:

```
LD-YYYY-NNNN
```

Example: `LD-2026-0001`

---

## Load Status Workflow

Loads progress through these statuses:

```
Scheduled → In Transit → Delivered
                ↓
             Pending (if issues)
```

| Status         | Description                      | Color  |
| -------------- | -------------------------------- | ------ |
| **Scheduled**  | Load planned, not yet dispatched | Blue   |
| **In Transit** | Vehicle is en route              | Green  |
| **Pending**    | Awaiting action or issues        | Yellow |
| **Delivered**  | Successfully completed           | Gray   |

### Changing Status

1. Click on a load in the table
2. In the Edit dialog, change the status
3. Or use the **Confirm Delivery** action for delivered loads

---

## Filtering and Searching

### Quick Filters

- **Status Filter** - Show loads by status
- **Origin Filter** - Filter by loading location
- **Week Filter** - Show loads for specific week

### Search

Use the search box to find loads by:

- Load ID
- Driver name
- Origin location

---

## Editing Loads

1. Click on any load row to open the edit dialog
2. Modify any field as needed
3. Click **Save Changes**

You can edit:

- Dates and times
- Origin/destination
- Assigned vehicle and driver
- Status
- Notes
- Backload configuration

---

## Confirming Delivery

When a load is delivered:

1. Click the **⋮** menu on the load row
2. Select **Confirm Delivery**
3. The status changes to "Delivered"

---

## Exporting to Excel

### Full Export

Click **Export** → **Full Details** to download an Excel file with:

- All load details
- Driver information
- Vehicle information
- Backload details
- Status and notes

### Simplified Export

Click **Export** → **Summary** for a condensed report suitable for printing.

---

## Tracking a Load

To track a vehicle's position:

1. Click the **⋮** menu on a load row
2. Select **Track Vehicle**
3. A map dialog shows real-time position
4. Share tracking via WhatsApp or copy link

> **Note:** Tracking requires the vehicle to have a telematics Asset ID configured.

---

## Best Practices

1. **Schedule in Advance** - Create loads at least one day before loading
2. **Assign Resources Early** - Ensure drivers and vehicles are assigned
3. **Use Backloads** - Optimize return trips with packaging/fertilizer backloads
4. **Update Status Promptly** - Keep statuses current for accurate reporting
5. **Add Notes** - Include relevant delivery instructions

---

## Related Guides

- [Backloads →](./backloads.md)
- [Live Tracking →](./live-tracking.md)
- [Reports →](./reports.md)
