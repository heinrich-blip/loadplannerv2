# Backloads

Backloads are return trip shipments that optimize fleet utilization by carrying cargo back to origin farms. This guide explains how to configure and manage backloads.

## Overview

### What is a Backload?

A backload is return cargo transported on a vehicle's journey back after completing a delivery. Common backload cargo includes:

- **Packaging** - Empty bins, crates, and pallets returning to farms
- **Fertilizer** - Fertilizer deliveries to farms

### Benefits of Backloads

- **Reduced empty miles** - Vehicles carry cargo on return trips
- **Cost efficiency** - Maximize each trip's value
- **Packaging tracking** - Monitor bin/crate/pallet returns
- **Inventory management** - Track packaging at farm level

---

## Backload Destinations

Backloads typically return to farm origins:

| Destination | Description |
|-------------|-------------|
| **BV** | BV Farm |
| **CBC** | CBC Farm |

---

## Backload Cargo Types

| Type | Description |
|------|-------------|
| **Packaging** | Empty bins, crates, pallets |
| **Fertilizer** | Fertilizer deliveries |

---

## Creating a Backload

### Option 1: During Load Creation

When creating a new load:

1. Expand the **"Backload Configuration"** section
2. Check **"Include Backload"**
3. Configure:
   - **Destination** - Where backload goes (BV/CBC)
   - **Cargo Type** - Packaging or Fertilizer
   - **Offloading Date** - When backload arrives
   - **Quantities** - Bins, crates, pallets counts
   - **Notes** - Special instructions

### Option 2: Adding to Existing Load

For loads without backloads configured:

1. Go to **Load Planning**
2. Click the **⋮** menu on the load row
3. Select **Add Backload**
4. Fill in the backload details:

#### Backload Form Fields

| Field | Description | Required |
|-------|-------------|----------|
| **Destination** | Farm receiving backload | Yes |
| **Cargo Type** | Packaging or Fertilizer | Yes |
| **Offloading Date** | Delivery date for backload | Yes |
| **Bins** | Number of bins | No (defaults to 0) |
| **Crates** | Number of crates | No (defaults to 0) |
| **Pallets** | Number of pallets | No (defaults to 0) |
| **Notes** | Additional instructions | No |

5. Click **Add Backload** to save

---

## Viewing Backload Information

### In Loads Table

Loads with backloads show:
- 🔄 **Backload indicator** icon
- Backload destination badge

### In Load Details

Open any load to see full backload configuration:
- Destination
- Cargo type
- Offloading date
- Quantities (bins, crates, pallets)
- Notes

---

## Editing Backloads

1. Open the load's edit dialog
2. Navigate to the backload section
3. Modify any fields
4. Save changes

---

## Removing a Backload

To remove a backload from a load:

1. Edit the load
2. Uncheck "Include Backload" or clear backload fields
3. Save changes

---

## Backload Workflow

```
1. Main Load Delivered
        ↓
2. Vehicle loads backload cargo
        ↓
3. Returns to farm (BV/CBC)
        ↓
4. Backload offloaded
        ↓
5. Packaging returned to inventory
```

---

## Packaging Dashboard

The Dashboard shows packaging statistics:

### Packaging Chart

Visual breakdown of returned packaging:
- **Bins** - Total bins returned
- **Crates** - Total crates returned
- **Pallets** - Total pallets returned

### Weekly Summary

Weekly totals for packaging returns from all backloads.

---

## Reports

### Backload Reports

Generate reports on backload operations:

1. Go to **Reports**
2. Select **Packaging Returns** report
3. Filter by date range
4. Export to PDF or Excel

### Metrics Tracked

- Total backloads per period
- Packaging quantities by farm
- Return rates by route
- Trends over time

---

## Best Practices

### Planning

1. **Schedule backloads proactively** - Plan returns when scheduling main loads
2. **Coordinate with farms** - Confirm packaging availability
3. **Set realistic dates** - Account for loading time after main delivery

### Quantities

1. **Be accurate** - Enter correct counts for inventory tracking
2. **Update if changed** - Adjust quantities if actual differs from planned
3. **Track trends** - Monitor packaging return patterns

### Notes

Use backload notes for:
- Special handling instructions
- Contact information at farms
- Loading dock assignments
- Priority information

---

## Troubleshooting

### Backload Not Showing

If a backload doesn't appear:
- Verify the load was saved
- Check that backload "enabled" is true
- Refresh the page

### Quantities Not Matching

If reported quantities differ:
- Update the backload with actual counts
- Add notes explaining discrepancies
- Review with farm personnel

---

## Related Guides

- [Load Management →](./load-management.md)
- [Reports →](./reports.md)
- [Dashboard Overview →](./getting-started.md)
