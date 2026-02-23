# Live Tracking

This guide covers real-time vehicle tracking, sharing tracking links, and telematics integration in LoadPlan.

## Overview

Live Tracking provides:

- Real-time GPS positions of all fleet vehicles
- Interactive map with vehicle markers
- Speed and status monitoring
- Geofence visualization
- ETA calculations
- Shareable tracking links for clients

---

## Accessing Live Tracking

Click **Live Tracking** in the sidebar navigation.

---

## Prerequisites

### Telematics Connection

Live Tracking requires a connection to Telematics Guru:

1. Click **Connect** button (if not connected)
2. Enter API credentials
3. Connection persists for session

### Vehicle Setup

Each vehicle must have a **Telematics Asset ID** configured in Fleet Management.

---

## Map Interface

### Vehicle Markers

Vehicles appear on the map with:

- **Direction arrow** - points in heading direction
- **Color coding**:
  - 🟢 Green - Moving
  - 🔵 Blue - Stationary
  - ⚫ Gray - Offline/Disabled
- **Fleet number** - displayed below marker
- **Pulse animation** - indicates active trip

### Map Controls

| Control        | Function                    |
| -------------- | --------------------------- |
| **Zoom**       | +/- buttons or scroll wheel |
| **Pan**        | Click and drag              |
| **Reset View** | Click "Fit All" button      |

---

## Vehicle List Panel

The side panel shows all tracked vehicles:

### Vehicle Card Information

- Vehicle name/fleet number
- Current speed (km/h)
- Status (Moving/Stationary)
- Last update time
- Linked load (if any)

### Filtering Vehicles

- **Search** - Find by vehicle name
- **Show only linked** - Show vehicles with active loads
- **Sort** - By name, speed, or status

---

## Vehicle Details

Click any vehicle for detailed information:

### Position Details

| Info                   | Description                  |
| ---------------------- | ---------------------------- |
| **Latitude/Longitude** | GPS coordinates              |
| **Speed**              | Current speed in km/h        |
| **Heading**            | Direction of travel          |
| **Last Update**        | Time of last position report |

### Linked Load

If vehicle is assigned to a load:

- Load ID
- Origin → Destination
- Driver name
- Status

---

## Geofences

### What are Geofences?

Geofences are virtual boundaries around locations (farms, depots) used for:

- Arrival/departure detection
- ETA calculations
- Automated alerts

### Viewing Geofences

1. Toggle **"Show Geofences"** option
2. Geofences appear as circles on map
3. Hover for geofence name

### Available Geofences

Common geofences include:

- BV Farm
- CBC Farm
- Bulawayo Depot
- Rezende Depot
- Mutare Depot

---

## ETA Calculation

### How ETA Works

When a vehicle is linked to a load:

1. System identifies destination geofence
2. Calculates distance from current position
3. Estimates arrival based on current speed

### ETA Display

- **Distance** - Kilometers to destination
- **Time** - Estimated travel time
- **ETA** - Estimated arrival time
- **Speed Factor** - Adjusts for current speed

> **Note:** ETA is an estimate based on straight-line distance and current speed.

---

## Sharing Tracking

### Why Share Tracking?

- Keep clients informed of delivery status
- Provide real-time visibility
- Reduce "where's my delivery?" calls
- Professional customer service

### Creating Shareable Links

#### From Live Tracking Page

1. Click on a vehicle
2. Click **Create Tracking Link**
3. Select validity duration:
   - 4 hours
   - 12 hours
   - 24 hours
   - 48 hours
   - 72 hours
4. Link is copied to clipboard

#### From Load Details

1. Open a load's tracking dialog
2. Click **Share** dropdown
3. Select **Create Live Tracking Link**
4. Choose duration
5. Link copies automatically

### What Recipients See

Shareable tracking page shows:

- Live map with vehicle position
- Vehicle speed and status
- Load details (ID, route)
- Driver information
- Last update time
- Link expiry countdown

---

## Sharing via WhatsApp

### Message Formats

Choose from multiple formats:

| Format           | Best For                       |
| ---------------- | ------------------------------ |
| **Professional** | Client communications, branded |
| **Detailed**     | Internal use, full information |
| **Compact**      | Quick updates                  |
| **Minimal**      | SMS, brief reference           |

### Professional Format Example

```
━━━━━━━━━━━━━━━━━━━━━━
   🚚 LOADPLAN TRACKING
━━━━━━━━━━━━━━━━━━━━━━

🟢 Status: IN TRANSIT

📋 SHIPMENT DETAILS
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
📦 Load: LD-2026-0001
📍 BV
    ↓
📍 Bulawayo Depot

📅 Loaded: Today, 08:00
🎯 ETA: Today, 16:00

Progress: ▓▓▓▓▓░░░░░ 50%

🚛 VEHICLE & DRIVER
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
Vehicle: FLT-001 (Rigid)
Driver: John Smith
📞 +263 77 123 4567

📡 LIVE POSITION
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
🏃 Speed: 85 km/h

📍 View on Maps:
https://maps.google.com/?q=-19.123,29.456

━━━━━━━━━━━━━━━━━━━━━━
🔴 LIVE TRACKING

👇 Tap to track in real-time:
https://yourapp.com/track?token=abc123

⚡ Live updates • No login required
━━━━━━━━━━━━━━━━━━━━━━

Powered by LoadPlan™
```

### How to Share

1. Open vehicle tracking
2. Click **Share** → **Share via WhatsApp**
3. Select format (Professional recommended)
4. WhatsApp opens with message
5. Select recipient and send

---

## Tracking Link Management

### Active Links

View all active tracking links:

1. Open load details
2. See "Active Tracking Links" section
3. Shows expiry time and view count

### Revoking Links

To revoke a tracking link:

1. Delete the link from load details
2. Link immediately stops working

---

## Auto-Refresh

### Page Refresh

Live Tracking page auto-refreshes:

- Positions update every 30 seconds
- Manual refresh available via button

### Shareable Page Refresh

Client tracking pages auto-refresh:

- Positions update every 30 seconds
- Shows "last updated" timestamp

---

## Troubleshooting

### Vehicle Not Showing

If a vehicle doesn't appear:

1. Check telematics Asset ID is set
2. Verify Telematics Guru connection
3. Check vehicle's tracker is online
4. Refresh the page

### Position Not Updating

If position seems stale:

1. Check "Last Update" time
2. Vehicle's tracker may be offline
3. Telematics connection may need refresh

### Tracking Link Not Working

If shared link doesn't work:

1. Check link hasn't expired
2. Verify token is complete (not truncated)
3. Test link yourself first

### Geofences Not Showing

If geofences don't appear:

1. Toggle "Show Geofences" on
2. Zoom out to see wider area
3. Check Telematics Guru has geofences configured

---

## Best Practices

### Tracking Setup

1. **Configure all vehicles** - Set Asset IDs for entire fleet
2. **Test before sharing** - Verify tracking works before sending links
3. **Use appropriate duration** - Match link expiry to delivery timeframe

### Client Communication

1. **Share proactively** - Send links before clients ask
2. **Use professional format** - Maintain professional image
3. **Include driver contact** - Helps with delivery coordination

### Security

1. **Don't over-share** - Use appropriate link durations
2. **Monitor link usage** - Check view counts
3. **Revoke if needed** - Delete links for sensitive loads

---

## Related Guides

- [Fleet Management →](./fleet-management.md)
- [Load Management →](./load-management.md)
- [Third-Party Loads →](./third-party-loads.md)
