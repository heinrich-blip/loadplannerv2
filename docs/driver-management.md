# Driver Management

This guide covers managing drivers in LoadPlan, including profiles, documents, and document expiry tracking.

## Overview

Driver Management allows you to:

- Create and manage driver profiles
- Track driver documents and certifications
- Monitor document expiry dates
- Assign drivers to loads
- Store document files

---

## Accessing Driver Management

Click **Drivers** in the sidebar navigation.

---

## Driver Dashboard

The Drivers page displays all drivers as cards showing:

- Driver name and avatar
- Contact information
- Availability status
- Quick action buttons

---

## Adding a Driver

### Step 1: Click "+ Add Driver"

Opens the create driver dialog.

### Step 2: Enter Driver Details

#### Basic Information

| Field         | Description                 | Required |
| ------------- | --------------------------- | -------- |
| **Name**      | Driver's full name          | Yes      |
| **Contact**   | Phone number                | Yes      |
| **Available** | Whether driver is available | Yes      |

#### Document Information

| Field                       | Description        |
| --------------------------- | ------------------ |
| **ID Number**               | National ID number |
| **Passport Number**         | Passport number    |
| **Driver's License Number** | License number     |

#### Document Expiry Dates

| Field                          | Description                 |
| ------------------------------ | --------------------------- |
| **Passport Expiry**            | Passport expiration date    |
| **Driver's License Expiry**    | License expiration date     |
| **Retest Certificate Expiry**  | Retest certification expiry |
| **Medical Certificate Expiry** | Medical clearance expiry    |

#### Document Uploads

You can upload scanned copies of documents:

- Passport document
- Driver's license document
- Retest certificate document
- Medical certificate document

### Step 3: Save

Click **Add Driver** to save.

---

## Viewing Driver Details

Click **View** (eye icon) on any driver card to see:

- Personal information
- Contact details
- All document numbers
- Expiry dates
- Uploaded documents

---

## Editing a Driver

1. Click **Edit** (pencil icon) on the driver card
2. Modify any fields
3. Upload new documents if needed
4. Click **Save Changes**

---

## Deleting a Driver

1. Click **Delete** (trash icon) on the driver card
2. Confirm the deletion

> **Warning:** Ensure the driver has no active load assignments before deleting.

---

## Driver Availability

### Setting Availability

Toggle the **Available** switch to mark a driver as:

- **Available** - Can be assigned to loads
- **Unavailable** - On leave, sick, etc.

### In Load Assignment

When creating loads, only available drivers appear in the selection dropdown.

---

## Document Management

### Required Documents

| Document                | Purpose                  | Renewal Frequency |
| ----------------------- | ------------------------ | ----------------- |
| **Passport**            | International trips      | 5-10 years        |
| **Driver's License**    | Legal driving permit     | 5 years typical   |
| **Retest Certificate**  | Professional driver cert | Annual            |
| **Medical Certificate** | Health clearance         | Annual            |

### Uploading Documents

1. Edit the driver profile
2. Click the upload button next to the document field
3. Select the file (PDF, JPG, PNG)
4. Document is uploaded and linked

### Viewing Uploaded Documents

1. View driver details
2. Click on any uploaded document link
3. Document opens in new tab

---

## Document Expiry Tracking

### Why Track Expiries?

- Ensure drivers are legally authorized to drive
- Maintain compliance with transport regulations
- Avoid operational disruptions
- Protect against liability

### Expiry Alerts

The system automatically generates alerts:

| Status          | Days Until Expiry | Action                 |
| --------------- | ----------------- | ---------------------- |
| 🟢 **Upcoming** | 21+ days          | Plan renewal           |
| 🟡 **Warning**  | 8-20 days         | Schedule renewal       |
| 🟠 **Critical** | 1-7 days          | Urgent action          |
| 🔴 **Expired**  | 0 or past         | Cannot assign to loads |

### Missing Documents

The system also tracks:

- Documents with no expiry date entered
- Documents without uploaded files

View all alerts on the **Expiry Alerts** section of Reports.

---

## Driver Assignment to Loads

### Primary Driver

When creating a load:

1. Select driver from dropdown
2. Only available drivers are shown
3. Contact number is displayed for reference

### Co-Driver (Optional)

For long-haul trips:

1. Assign a co-driver if required
2. Co-driver appears on load details

---

## Best Practices

### Profile Management

1. **Complete profiles** - Enter all document information
2. **Upload documents** - Store scanned copies in the system
3. **Keep updated** - Update when documents are renewed

### Document Tracking

1. **Enter all expiry dates** - Track every document
2. **Set alerts** - Use expiry alerts for advance notice
3. **Update promptly** - Enter new dates immediately after renewal
4. **Upload renewed documents** - Replace old scans with new ones

### Availability Management

1. **Update availability** - Mark drivers unavailable when appropriate
2. **Plan ahead** - Consider availability when scheduling loads
3. **Communication** - Coordinate with drivers on schedules

---

## Driver Documents Detail

### Passport

- Required for cross-border trips
- International identification
- Track expiry well in advance

### Driver's License

- Legal requirement to operate vehicles
- Must match vehicle class
- Critical document - cannot drive without valid license

### Retest Certificate

- Professional driver certification
- Required for commercial vehicle operation
- Usually annual renewal

### Medical Certificate

- Health fitness clearance
- Required for commercial drivers
- Annual checkup typically required

---

## Troubleshooting

### Driver Not in Assignment List

If a driver doesn't appear when creating loads:

1. Check if driver is marked "Available"
2. Review any expired critical documents
3. Verify driver exists in system
4. Refresh the page

### Document Upload Failed

If document upload fails:

1. Check file size (max limits apply)
2. Verify file format (PDF, JPG, PNG)
3. Try a different browser
4. Contact support if persistent

### Expiry Alert Not Showing

If expiry alerts are missing:

1. Verify expiry dates are entered
2. Check date format is correct
3. Refresh the Reports page

---

## Related Guides

- [Load Management →](./load-management.md)
- [Expiry Alerts →](./expiry-alerts.md)
- [Fleet Management →](./fleet-management.md)
