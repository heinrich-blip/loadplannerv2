# Third-Party Loads

Third-party loads allow you to manage shipments for external clients and contractors. This guide covers creating and managing client loads.

## Overview

Third-party loads are distinct from internal loads:

| Feature   | Internal Loads          | Third-Party Loads |
| --------- | ----------------------- | ----------------- |
| Client    | Own operations          | External clients  |
| Locations | Predefined farms/depots | Custom locations  |
| Billing   | Not applicable          | Client billable   |
| Tracking  | Standard                | Shareable links   |

---

## Accessing Third-Party Loads

Click **Third Party Loads** in the sidebar navigation.

---

## Managing Clients

Before creating third-party loads, set up your client database.

### Creating a Client

1. Click **+ New Client** button
2. Fill in client details:

| Field              | Description            | Required |
| ------------------ | ---------------------- | -------- |
| **Name**           | Company or client name | Yes      |
| **Contact Person** | Primary contact name   | No       |
| **Contact Phone**  | Phone number           | No       |
| **Contact Email**  | Email address          | No       |
| **Notes**          | Additional information | No       |

3. Click **Create Client**

### Managing Existing Clients

Access the **Clients** page from the sidebar to:

- View all clients
- Edit client information
- Deactivate clients

---

## Creating a Third-Party Load

### Step 1: Click "+ New Third-Party Load"

Opens the create dialog.

### Step 2: Select Client

Choose an existing client from the dropdown, or create a new client inline by clicking **+ New Client**.

### Step 3: Enter Load Details

#### Basic Information

| Field               | Description          | Required |
| ------------------- | -------------------- | -------- |
| **Priority**        | High, Medium, or Low | Yes      |
| **Loading Date**    | Pickup date          | Yes      |
| **Offloading Date** | Delivery date        | Yes      |
| **Cargo Type**      | Type of cargo        | Yes      |

#### Locations

Unlike internal loads, third-party loads use custom locations:

**Loading Location:**
| Field | Description |
|-------|-------------|
| Place Name | Name of pickup location |
| Address | Full address (optional) |
| Planned Arrival | Expected arrival time |
| Planned Departure | Expected departure time |

**Offloading Location:**
| Field | Description |
|-------|-------------|
| Place Name | Name of delivery location |
| Address | Full address (optional) |
| Planned Arrival | Expected arrival time |
| Planned Departure | Expected departure time |

### Step 4: Assign Resources

| Field             | Description                 |
| ----------------- | --------------------------- |
| **Fleet Vehicle** | Select vehicle for the load |
| **Driver**        | Assign the driver           |
| **Notes**         | Special instructions        |

### Step 5: Link to Internal Load (Optional)

You can link a third-party load to an existing internal load:

1. Click **Link to Load**
2. Select the internal load from the list
3. This associates the third-party work with the main trip

### Step 6: Configure Backload (Optional)

Third-party loads can also have backloads:

1. Check **Include Backload**
2. Configure backload details
3. Enter quantities

### Step 7: Save

Click **Create Load** to save.

---

## Third-Party Load ID Format

Third-party loads have a different ID format:

```
TP-YYYY-NNNN
```

Example: `TP-2026-0001`

---

## Filtering Third-Party Loads

### Available Filters

- **Search** - Find by load ID, client name, or location
- **Status** - Filter by status
- **Week** - Show loads for specific week

### Client Filter

Filter to show only loads for a specific client.

---

## Editing Third-Party Loads

1. Click on any load row
2. Edit Load dialog opens
3. Modify fields as needed
4. Save changes

---

## Sharing Tracking with Clients

Third-party loads support shareable tracking links:

### Creating a Tracking Link

1. Open the load's tracking dialog
2. Click **Share** dropdown
3. Select **Create Live Tracking Link**
4. Choose validity duration (4h, 12h, 24h, 48h, 72h)
5. Link is copied to clipboard

### Sharing via WhatsApp

1. Click **Share** → **Share via WhatsApp**
2. Choose message format:
   - **Professional** - Branded, clean format
   - **Detailed** - Comprehensive information
   - **Compact** - Quick summary
   - **Minimal** - Just essentials
3. WhatsApp opens with pre-filled message

### What Clients See

Shareable tracking links show:

- Vehicle position on map
- Current speed and status
- Load details (origin, destination)
- ETA information
- Auto-refresh every 30 seconds

---

## Status Management

Third-party loads follow the same status workflow:

```
Scheduled → In Transit → Delivered
```

### Updating Status

1. Edit the load
2. Change status dropdown
3. Save

Or use **Confirm Delivery** for completed loads.

---

## Exporting Third-Party Loads

### Excel Export

Click **Export** to download load data:

- Full Details export
- Summary export

### Load-Specific PDF

Generate a PDF for individual loads:

1. Click the **⋮** menu on a load
2. Select **Export PDF**

---

## Best Practices

### Client Management

1. **Complete profiles** - Add contact details for easy communication
2. **Use notes** - Record special requirements
3. **Keep updated** - Maintain accurate client information

### Load Planning

1. **Clear locations** - Use descriptive place names
2. **Accurate addresses** - Include full addresses for new locations
3. **Contact info** - Add site contact in notes if different from client

### Communication

1. **Share tracking proactively** - Send links before clients ask
2. **Use professional format** - Select appropriate message style
3. **Update on delays** - Communicate status changes

---

## Troubleshooting

### Client Not in List

If a client doesn't appear:

1. Check if client is active
2. Create new client if needed
3. Refresh the page

### Tracking Link Not Working

If tracking doesn't show vehicle:

1. Verify vehicle has telematics Asset ID
2. Check telematics system connection
3. Ensure link hasn't expired

---

## Related Guides

- [Load Management →](./load-management.md)
- [Live Tracking →](./live-tracking.md)
- [Backloads →](./backloads.md)
