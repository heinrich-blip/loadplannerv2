# Expiry Alerts

This guide covers the document expiry monitoring system in LoadPlan, which helps ensure compliance by tracking vehicle and driver document expiration dates.

## Overview

The Expiry Alerts system:

- Monitors all document expiry dates
- Generates alerts based on urgency
- Identifies missing documents
- Helps prevent compliance issues
- Provides exportable reports

---

## Accessing Expiry Alerts

1. Go to **Reports** page
2. Navigate to the **Expiry Alerts** section

Or access from Dashboard widgets if configured.

---

## Documents Tracked

### Driver Documents

| Document                | Field                      | Description                       |
| ----------------------- | -------------------------- | --------------------------------- |
| **Passport**            | passport_expiry            | International travel document     |
| **Driver's License**    | drivers_license_expiry     | Driving authorization             |
| **Retest Certificate**  | retest_certificate_expiry  | Professional driver certification |
| **Medical Certificate** | medical_certificate_expiry | Health clearance                  |

### Vehicle Documents

| Document            | Field                | Description                      |
| ------------------- | -------------------- | -------------------------------- |
| **Vehicle License** | license_expiry       | Road tax/registration            |
| **COF**             | cof_expiry           | Certificate of Fitness           |
| **Radio License**   | radio_license_expiry | Two-way radio permit             |
| **Insurance**       | insurance_expiry     | Vehicle insurance policy         |
| **SVG**             | svg_expiry           | Vehicle registration certificate |

---

## Alert Levels

Alerts are categorized by urgency:

| Level           | Days Until Expiry | Color  | Action Required            |
| --------------- | ----------------- | ------ | -------------------------- |
| 🔴 **Expired**  | Already past      | Red    | Immediate - Cannot operate |
| 🟠 **Critical** | 1-7 days          | Orange | Urgent - Schedule now      |
| 🟡 **Warning**  | 8-20 days         | Yellow | Soon - Plan renewal        |
| 🟢 **Upcoming** | 21+ days          | Green  | Planned - Advance notice   |

---

## Understanding Alerts

### Alert Information

Each alert shows:

| Field              | Description                |
| ------------------ | -------------------------- |
| **Type**           | Driver or Vehicle          |
| **Entity Name**    | Driver name or Vehicle ID  |
| **Document**       | Which document is expiring |
| **Expiry Date**    | When it expires            |
| **Days Remaining** | Days until expiry          |
| **Status**         | Alert level (color coded)  |

### Alert Example

```
🔴 EXPIRED
Driver: John Smith
Document: Driver's License
Expiry Date: 15 Jan 2026
Days: -19 (expired 19 days ago)
```

---

## Missing Documents

Beyond expiry tracking, the system identifies:

### Missing Expiry Dates

Documents with no expiry date entered:

- Shows as "No expiry date set"
- Should be updated with actual date

### Missing Document Files

Documents without uploaded files:

- Indicates document needs to be scanned
- Important for record keeping

---

## Alert Dashboard

### Summary Cards

| Card             | Shows              |
| ---------------- | ------------------ |
| **Total Alerts** | All active alerts  |
| **Expired**      | Past-due documents |
| **Critical**     | Due within 7 days  |
| **Warnings**     | Due within 20 days |

### Alert Lists

Alerts are grouped by:

- **By Type** - Drivers vs Vehicles
- **By Status** - Expired, Critical, Warning
- **By Document** - License, COF, Insurance, etc.

---

## Taking Action

### Viewing Details

1. Click on any alert
2. Opens driver/vehicle details
3. Shows full document information

### Updating After Renewal

1. Navigate to Driver or Fleet page
2. Edit the driver/vehicle profile
3. Update the expiry date
4. Upload new document (optional)
5. Save changes
6. Alert automatically clears

---

## Filtering Alerts

### By Type

- **All** - All alerts
- **Drivers** - Driver document alerts only
- **Vehicles** - Vehicle document alerts only

### By Status

- **All Status** - All alert levels
- **Expired** - Only expired
- **Critical** - Only critical
- **Warning** - Only warnings
- **Upcoming** - Only upcoming

### By Document Type

Filter to specific document:

- Driver's License
- Passport
- COF
- Insurance
- etc.

---

## Export Options

### PDF Report

Export alerts as PDF:

1. Apply desired filters
2. Click **Export PDF**
3. Report includes:
   - Summary statistics
   - All alerts listed
   - Document details
   - Export date

### Excel Export

Export for analysis:

1. Apply filters
2. Click **Export Excel**
3. Spreadsheet includes all alert data

---

## Workflow Recommendations

### Daily Check

1. Review Dashboard for alert count
2. Address any **Expired** items immediately
3. Note **Critical** items for today's action

### Weekly Review

1. Go to Expiry Alerts section
2. Review all **Critical** and **Warning** items
3. Schedule renewals as needed
4. Update any renewed documents

### Monthly Audit

1. Export full alert report
2. Review all **Upcoming** items
3. Plan renewals for next 30 days
4. Check for missing documents

---

## Best Practices

### Prevention

1. **Enter all dates** - Don't leave expiry dates blank
2. **Update promptly** - Enter new dates immediately after renewal
3. **Regular reviews** - Check alerts at least weekly

### Organization

1. **Lead time** - Start renewal process 30+ days before expiry
2. **Calendar reminders** - Set external reminders for critical dates
3. **Responsibility** - Assign document management to specific person

### Documentation

1. **Upload documents** - Keep scanned copies in system
2. **Update uploads** - Replace with renewed documents
3. **Verify accuracy** - Double-check dates when entering

---

## Alert Notifications

### Current Behavior

- Alerts visible on Reports page
- Badge counts on Dashboard
- Must check manually

### Planned Features

Future enhancements may include:

- Email notifications
- SMS alerts
- Push notifications
- Scheduled reports

---

## Compliance Importance

### Why Document Compliance Matters

| Document         | Risk if Expired                     |
| ---------------- | ----------------------------------- |
| Driver's License | Illegal operation, fines, liability |
| Vehicle License  | Police impound, fines               |
| COF              | Unsafe vehicle, penalties           |
| Insurance        | No coverage, major liability        |
| Passport         | Cannot cross borders                |

### Consequences

- **Legal penalties** - Fines, vehicle impound
- **Insurance void** - No coverage if documents expired
- **Operational delays** - Cannot dispatch non-compliant resources
- **Reputation damage** - Client trust issues

---

## Troubleshooting

### Alerts Not Appearing

If expected alerts don't show:

1. Verify expiry dates are entered
2. Check date format is correct
3. Refresh the page
4. Clear browser cache

### Wrong Alert Level

If alert level seems incorrect:

1. Verify the expiry date entered
2. Check system date is correct
3. Recalculate days manually

### Document Shows Missing But Exists

If document marked missing incorrectly:

1. Re-upload the document
2. Save the profile
3. Refresh alerts page

---

## Related Guides

- [Driver Management →](./driver-management.md)
- [Fleet Management →](./fleet-management.md)
- [Reports →](./reports.md)
