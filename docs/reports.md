# Reports & Analytics

This guide covers the reporting and analytics features in LoadPlan for operational insights and performance tracking.

## Overview

The Reports module provides:

- Load statistics and trends
- Route analysis
- Cargo distribution charts
- Packaging/backload reports
- Export capabilities (PDF, Excel)

---

## Accessing Reports

Click **Reports** in the sidebar navigation.

---

## Report Types

### Overview Tab

High-level statistics and charts:

#### Key Metrics

| Metric                   | Description                        |
| ------------------------ | ---------------------------------- |
| **Total Loads**          | All loads in selected period       |
| **On-Time Delivery**     | Percentage delivered on schedule   |
| **Average Transit Time** | Mean time from loading to delivery |
| **Total Weight**         | Sum of all cargo weights           |

#### Charts

- **Weekly Load Trend** - Load volumes over time
- **Cargo Distribution** - Breakdown by cargo type
- **Status Distribution** - Loads by current status

---

### Routes Tab

Route-specific analysis:

#### Route Performance

| Metric               | Description               |
| -------------------- | ------------------------- |
| **Loads per Route**  | Number of trips per route |
| **Total Weight**     | Cargo moved per route     |
| **Average Duration** | Typical transit time      |

#### Top Routes Chart

Bar chart showing most active routes.

#### Route Details Table

| Column       | Description           |
| ------------ | --------------------- |
| Route        | Origin → Destination  |
| Loads        | Number of loads       |
| Total Weight | Weight transported    |
| Avg Duration | Average transit hours |

---

### Packaging Tab

Backload and packaging statistics:

#### Packaging Returns

| Metric            | Description                |
| ----------------- | -------------------------- |
| **Total Bins**    | Bins returned in period    |
| **Total Crates**  | Crates returned in period  |
| **Total Pallets** | Pallets returned in period |

#### By Destination

Packaging quantities broken down by farm:

- BV Farm totals
- CBC Farm totals

#### Trend Chart

Weekly packaging return volumes.

---

### Performance Tab

Operational performance metrics:

#### Driver Performance

- Loads completed per driver
- On-time delivery rate
- Average transit time

#### Vehicle Utilization

- Trips per vehicle
- Capacity utilization
- Active vs idle time

---

## Filtering Reports

### Date Range Selection

| Option           | Description           |
| ---------------- | --------------------- |
| **This Week**    | Current week's data   |
| **Last Week**    | Previous week         |
| **This Month**   | Current month         |
| **Last Month**   | Previous month        |
| **Custom Range** | Select specific dates |

### Additional Filters

- **Origin** - Filter by loading location
- **Destination** - Filter by delivery location
- **Cargo Type** - Filter by cargo type
- **Driver** - Filter by assigned driver
- **Vehicle** - Filter by fleet vehicle

---

## Export Options

### PDF Export

Generate printable PDF reports:

1. Configure filters and date range
2. Click **Export** → **PDF**
3. PDF includes:
   - Summary statistics
   - Charts and visualizations
   - Detailed tables
   - Date range and filter info

### Excel Export

Export raw data for analysis:

1. Configure filters
2. Click **Export** → **Excel**
3. Spreadsheet includes:
   - All data columns
   - Filterable rows
   - Ready for analysis

---

## Charts Explained

### Weekly Load Trend

**Type:** Area/Line Chart

**Shows:** Load volumes week by week

**Breakdown:**

- Scheduled (blue)
- In Transit (green)
- Delivered (gray)
- Pending (yellow)

**Use:** Identify volume patterns, plan resources

---

### Cargo Distribution

**Type:** Pie Chart

**Shows:** Percentage of loads by cargo type

**Categories:**

- VanSalesRetail
- Retail
- Vendor
- RetailVendor
- Fertilizer
- Export

**Use:** Understand cargo mix, identify trends

---

### Status Distribution

**Type:** Pie/Donut Chart

**Shows:** Current load status breakdown

**Statuses:**

- Scheduled
- In Transit
- Delivered
- Pending

**Use:** Monitor operational flow

---

### Route Performance

**Type:** Bar Chart

**Shows:** Load volumes by route

**Data:** Origin → Destination pairs

**Use:** Identify busy routes, optimize planning

---

### Packaging Returns

**Type:** Stacked Bar Chart

**Shows:** Packaging returned by type and destination

**Categories:**

- Bins
- Crates
- Pallets

**Use:** Track packaging inventory, plan requirements

---

## Report Scenarios

### Weekly Operations Review

1. Set date range to "Last Week"
2. Review Overview tab for KPIs
3. Check Routes tab for performance
4. Export PDF for meeting

### Monthly Management Report

1. Set date range to "Last Month"
2. Export full PDF report
3. Review all tabs
4. Note trends and issues

### Packaging Inventory Check

1. Go to Packaging tab
2. Set appropriate date range
3. Review returns by destination
4. Compare against expected

### Driver Performance Review

1. Go to Performance tab
2. Filter by specific driver
3. Review on-time rates
4. Compare against benchmarks

---

## Best Practices

### Regular Reviews

1. **Daily** - Check dashboard KPIs
2. **Weekly** - Review route performance
3. **Monthly** - Full report analysis
4. **Quarterly** - Trend analysis

### Data Quality

1. **Update statuses** - Keep load statuses current
2. **Complete loads** - Enter all required fields
3. **Backload data** - Track packaging returns

### Using Insights

1. **Route optimization** - Adjust based on performance
2. **Resource planning** - Use trends for scheduling
3. **Client reporting** - Share relevant metrics

---

## Troubleshooting

### No Data Showing

If reports are empty:

1. Check date range selection
2. Verify filters aren't too restrictive
3. Ensure loads exist for period
4. Refresh the page

### Export Failed

If export doesn't work:

1. Check browser popup settings
2. Try different browser
3. Reduce data volume (narrow filters)

### Charts Not Loading

If charts don't display:

1. Wait for data load
2. Refresh the page
3. Check browser console for errors

---

## Related Guides

- [Load Management →](./load-management.md)
- [Backloads →](./backloads.md)
- [Expiry Alerts →](./expiry-alerts.md)
