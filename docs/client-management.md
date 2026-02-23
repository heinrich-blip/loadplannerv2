# Client Management

This guide covers managing clients in LoadPlan, including client setup, location storage, and their use in third-party loads.

## Overview

Client Management allows you to:

- Create and manage client profiles
- Store client location information
- Use clients in third-party load assignments
- Track client-specific loads

---

## Accessing Client Management

Click **Clients** in the sidebar navigation.

---

## Client Dashboard

The Clients page displays all clients with:

- Company name
- Contact person
- Phone number
- Email address
- Location details
- Quick action buttons

---

## Adding a Client

### Step 1: Click "+ Add Client"

Opens the create client dialog.

### Step 2: Enter Client Details

#### Basic Information

| Field              | Description            | Required |
| ------------------ | ---------------------- | -------- |
| **Company Name**   | Client's business name | Yes      |
| **Contact Person** | Primary contact name   | No       |
| **Phone**          | Contact phone number   | No       |
| **Email**          | Contact email address  | No       |

#### Location Information

| Field         | Description              |
| ------------- | ------------------------ |
| **Address**   | Physical/street address  |
| **City**      | City/town                |
| **Country**   | Country                  |
| **Latitude**  | GPS latitude coordinate  |
| **Longitude** | GPS longitude coordinate |

> **Note:** Latitude/Longitude enable map features for the client location.

### Step 3: Save

Click **Add Client** to save.

---

## Viewing Client Details

Click **View** (eye icon) on any client card to see:

- All contact information
- Full address
- Map coordinates
- Created/updated timestamps

---

## Editing a Client

1. Click **Edit** (pencil icon) on the client card
2. Modify any fields
3. Click **Save Changes**

---

## Deleting a Client

1. Click **Delete** (trash icon) on the client card
2. Confirm the deletion

> **Warning:** Consider if client has associated loads before deleting.

---

## Client Locations

### Why Store Locations?

- Use as origin/destination in third-party loads
- Enable map visualization
- Calculate ETAs and distances
- Pre-fill addresses consistently

### GPS Coordinates

For accurate mapping, include:

- **Latitude** - North/South position (e.g., -19.8883)
- **Longitude** - East/West position (e.g., 34.0417)

### Finding Coordinates

1. Go to Google Maps
2. Right-click on location
3. Copy coordinates
4. Enter in client profile

---

## Using Clients in Loads

### Third-Party Loads

When creating a third-party load:

1. Select client from dropdown
2. Client info auto-fills:
   - Client name
   - Contact details
   - Location (if configured)

### Client as Origin/Destination

Clients can be:

- **Loading Client** - Where cargo is collected
- **Delivery Client** - Where cargo is delivered

### Benefits

- Consistent addressing
- Quick selection
- Automatic location data
- Client-specific reporting

---

## Client Categories

Organize clients by type:

| Type          | Description               |
| ------------- | ------------------------- |
| **Shipper**   | Clients who send cargo    |
| **Consignee** | Clients who receive cargo |
| **Both**      | Clients who do both       |

---

## Best Practices

### Data Quality

1. **Complete profiles** - Fill all available fields
2. **Accurate locations** - Include GPS coordinates
3. **Current contacts** - Keep contact info updated

### Organization

1. **Consistent naming** - Use official company names
2. **Primary contacts** - Identify key contact person
3. **Multiple locations** - Create separate entries if needed

### Usage

1. **Link to loads** - Always associate loads with clients
2. **Regular updates** - Verify info periodically
3. **Clean up** - Remove obsolete clients

---

## Searching Clients

### Quick Search

Type in search box to filter by:

- Company name
- Contact person
- City
- Phone/Email

### Alphabetical Browse

Clients listed alphabetically by company name.

---

## Troubleshooting

### Client Not in Dropdown

If client doesn't appear in load creation:

1. Verify client exists in system
2. Refresh the page
3. Check search filter isn't applied

### Location Not Showing on Map

If client location missing from map:

1. Verify latitude/longitude are entered
2. Check coordinates are valid
3. Refresh map view

---

## Related Guides

- [Third-Party Loads →](./third-party-loads.md)
- [Load Management →](./load-management.md)
- [Live Tracking →](./live-tracking.md)
