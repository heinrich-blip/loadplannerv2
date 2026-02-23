# Fleet Management

This guide covers managing your fleet vehicles in LoadPlan, including vehicle setup, telematics integration, and document tracking.

## Overview

Fleet Management allows you to:

- Add and manage vehicles in your fleet
- Track vehicle details and specifications
- Link vehicles to telematics for GPS tracking
- Monitor document expiry dates
- Assign vehicles to loads

---

## Accessing Fleet Management

Click **Fleet** in the sidebar navigation.

---

## Fleet Dashboard

The Fleet page displays all vehicles as cards showing:

- Vehicle ID (fleet number)
- Vehicle type
- Capacity
- Availability status
- Quick action buttons

---

## Adding a Vehicle

### Step 1: Click "+ Add Vehicle"

Opens the create vehicle dialog.

### Step 2: Enter Vehicle Details

#### Basic Information

| Field          | Description                    | Required |
| -------------- | ------------------------------ | -------- |
| **Vehicle ID** | Fleet number (e.g., "FLT-001") | Yes      |
| **Type**       | Vehicle type                   | Yes      |
| **Capacity**   | Load capacity in tons          | Yes      |
| **Available**  | Whether vehicle is available   | Yes      |

#### Vehicle Types

| Type           | Description                 |
| -------------- | --------------------------- |
| **Rigid**      | Rigid truck                 |
| **Horse**      | Truck tractor (prime mover) |
| **Trailer**    | Trailer unit                |
| **Super Link** | Super link combination      |
| **Interlink**  | Interlink combination       |

#### Technical Details

| Field             | Description                    |
| ----------------- | ------------------------------ |
| **VIN Number**    | Vehicle Identification Number  |
| **Engine Number** | Engine serial number           |
| **Make/Model**    | Vehicle manufacturer and model |
| **Engine Size**   | Engine displacement            |

#### Telematics Integration

| Field                   | Description                                 |
| ----------------------- | ------------------------------------------- |
| **Telematics Asset ID** | ID from telematics system (Telematics Guru) |

> **Important:** The Asset ID links the vehicle to GPS tracking. Without this, live tracking won't work.

#### Document Expiry Dates

| Field                    | Description                       |
| ------------------------ | --------------------------------- |
| **License Expiry**       | Vehicle license expiration        |
| **COF Expiry**           | Certificate of Fitness expiration |
| **Radio License Expiry** | Radio license expiration          |
| **Insurance Expiry**     | Insurance policy expiration       |
| **SVG Expiry**           | Vehicle registration expiration   |

### Step 3: Save

Click **Add Vehicle** to save.

---

## Viewing Vehicle Details

Click **View** (eye icon) on any vehicle card to see:

- All vehicle specifications
- Technical details
- Document expiry dates
- Telematics configuration
- Last updated timestamp

---

## Editing a Vehicle

1. Click **Edit** (pencil icon) on the vehicle card
2. Modify any fields
3. Click **Save Changes**

---

## Deleting a Vehicle

1. Click **Delete** (trash icon) on the vehicle card
2. Confirm the deletion

> **Warning:** Deleting a vehicle removes it from the system. Ensure no active loads are assigned.

---

## Vehicle Availability

### Setting Availability

Toggle the **Available** switch to mark a vehicle as:

- **Available** - Can be assigned to loads
- **Unavailable** - In maintenance, out of service, etc.

### In Load Assignment

When creating loads, only available vehicles appear in the selection dropdown.

---

## Telematics Integration

### What is Telematics?

Telematics provides GPS tracking capabilities through the Telematics Guru platform, enabling:

- Real-time vehicle location
- Speed monitoring
- Trip status (moving/stationary)
- Historical tracking data

### Setting Up Telematics

1. **Get Asset ID** - Obtain the Asset ID from Telematics Guru for each vehicle
2. **Edit Vehicle** - Open the vehicle in edit mode
3. **Enter Asset ID** - Input the telematics Asset ID
4. **Save** - Vehicle is now linked for tracking

### Finding Asset ID

1. Go to **Live Tracking** page
2. Connect to Telematics Guru
3. View the asset list to find vehicle IDs
4. Note the Asset ID for each vehicle

---

## Document Expiry Tracking

### Why Track Expiries?

- Ensure compliance with regulations
- Avoid fines and penalties
- Prevent service interruptions
- Maintain fleet roadworthiness

### Documents Tracked

| Document            | Description              | Typical Renewal |
| ------------------- | ------------------------ | --------------- |
| **Vehicle License** | Registration/road tax    | Annual          |
| **COF**             | Certificate of Fitness   | 6-12 months     |
| **Radio License**   | Two-way radio permit     | Annual          |
| **Insurance**       | Vehicle insurance policy | Annual          |
| **SVG**             | Registration certificate | As required     |

### Expiry Alerts

The system automatically generates alerts:

| Status          | Days Until Expiry | Action              |
| --------------- | ----------------- | ------------------- |
| 🟢 **Upcoming** | 21+ days          | Plan renewal        |
| 🟡 **Warning**  | 8-20 days         | Schedule renewal    |
| 🟠 **Critical** | 1-7 days          | Urgent action       |
| 🔴 **Expired**  | 0 or past         | Immediate attention |

View all alerts on the **Expiry Alerts** section of Reports.

---

## Vehicle Assignment to Loads

### When Creating a Load

1. Select vehicle from dropdown
2. Only available vehicles are shown
3. System shows vehicle type and capacity

### Viewing Assigned Loads

Currently assigned loads appear:

- In the Loads table (vehicle column)
- When tracking the vehicle

---

## Best Practices

### Data Accuracy

1. **Complete all fields** - Enter all available vehicle information
2. **Keep updated** - Update details when they change
3. **Verify Asset IDs** - Ensure telematics links are correct

### Document Management

1. **Enter all expiry dates** - Track all documents
2. **Set reminders** - Use expiry alerts for renewals
3. **Update promptly** - Enter new dates after renewal

### Fleet Organization

1. **Consistent naming** - Use a standard format for Vehicle IDs
2. **Accurate types** - Select correct vehicle type
3. **Capacity accuracy** - Enter actual capacity for planning

---

## Troubleshooting

### Vehicle Not Tracking

If a vehicle doesn't show on Live Tracking:

1. Verify telematics Asset ID is entered
2. Check Telematics Guru connection
3. Ensure vehicle's tracker is active

### Vehicle Not in Load Assignment

If a vehicle doesn't appear when creating loads:

1. Check if vehicle is marked "Available"
2. Verify vehicle exists in system
3. Refresh the page

---

## Related Guides

- [Live Tracking →](./live-tracking.md)
- [Load Management →](./load-management.md)
- [Expiry Alerts →](./expiry-alerts.md)
