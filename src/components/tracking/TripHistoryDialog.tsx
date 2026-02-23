import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  formatLastConnected,
  type TelematicsAsset,
} from "@/lib/telematicsGuru";
import type { ActiveLoadForTracking } from "@/lib/api";
import { useGeofenceEvents, type GeofenceEvent as DbGeofenceEvent } from "@/hooks/useGeofenceEvents";
import {
  MapPin,
  Route,
  Truck,
  Timer,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { useMemo } from "react";
import { format, formatDistanceStrict } from "date-fns";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoadTimelineEvent {
  type: string;
  label: string;
  time: string | null | undefined;
  source: string | null | undefined;
  verified: boolean;
  icon: typeof ArrowDownToLine;
  color: string;
}

interface LoadWithTimes {
  id: string;
  load_id: string;
  origin: string;
  destination: string;
  status: string;
  loading_date?: string;
  offloading_date?: string;
  actual_loading_arrival?: string | null;
  actual_loading_arrival_source?: string | null;
  actual_loading_arrival_verified?: boolean;
  actual_loading_departure?: string | null;
  actual_loading_departure_source?: string | null;
  actual_loading_departure_verified?: boolean;
  actual_offloading_arrival?: string | null;
  actual_offloading_arrival_source?: string | null;
  actual_offloading_arrival_verified?: boolean;
  actual_offloading_departure?: string | null;
  actual_offloading_departure_source?: string | null;
  actual_offloading_departure_verified?: boolean;
}

interface TripHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: TelematicsAsset | null;
  activeLoad?: ActiveLoadForTracking | null;
  vehicleLoads?: LoadWithTimes[];
  organisationId?: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy, HH:mm");
  } catch {
    return dateStr;
  }
}

const EVENT_CONFIG: Record<string, { label: string; icon: typeof ArrowDownToLine; color: string }> = {
  loading_arrival: { label: "Entered Loading Zone", icon: ArrowDownToLine, color: "text-blue-600" },
  loading_departure: { label: "Exited Loading Zone", icon: ArrowUpFromLine, color: "text-indigo-600" },
  offloading_arrival: { label: "Entered Offloading Zone", icon: ArrowDownToLine, color: "text-emerald-600" },
  offloading_departure: { label: "Exited Offloading Zone", icon: ArrowUpFromLine, color: "text-green-700" },
};

// ---------------------------------------------------------------------------
// GeofenceTimeline component (for loads with actual times)
// ---------------------------------------------------------------------------

function GeofenceTimeline({ load }: { load: LoadWithTimes }) {
  const events: LoadTimelineEvent[] = [
    {
      type: "loading_arrival",
      label: `Arrived at ${load.origin || "Origin"}`,
      time: load.actual_loading_arrival,
      source: load.actual_loading_arrival_source,
      verified: !!load.actual_loading_arrival_verified,
      icon: ArrowDownToLine,
      color: "text-blue-600",
    },
    {
      type: "loading_departure",
      label: `Departed ${load.origin || "Origin"}`,
      time: load.actual_loading_departure,
      source: load.actual_loading_departure_source,
      verified: !!load.actual_loading_departure_verified,
      icon: ArrowUpFromLine,
      color: "text-indigo-600",
    },
    {
      type: "offloading_arrival",
      label: `Arrived at ${load.destination || "Destination"}`,
      time: load.actual_offloading_arrival,
      source: load.actual_offloading_arrival_source,
      verified: !!load.actual_offloading_arrival_verified,
      icon: ArrowDownToLine,
      color: "text-emerald-600",
    },
    {
      type: "offloading_departure",
      label: `Departed ${load.destination || "Destination"}`,
      time: load.actual_offloading_departure,
      source: load.actual_offloading_departure_source,
      verified: !!load.actual_offloading_departure_verified,
      icon: ArrowUpFromLine,
      color: "text-green-700",
    },
  ];

  const loadingDwell =
    load.actual_loading_arrival && load.actual_loading_departure
      ? formatDistanceStrict(new Date(load.actual_loading_arrival), new Date(load.actual_loading_departure))
      : null;

  const offloadingDwell =
    load.actual_offloading_arrival && load.actual_offloading_departure
      ? formatDistanceStrict(new Date(load.actual_offloading_arrival), new Date(load.actual_offloading_departure))
      : null;

  const transitTime =
    load.actual_loading_departure && load.actual_offloading_arrival
      ? formatDistanceStrict(new Date(load.actual_loading_departure), new Date(load.actual_offloading_arrival))
      : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3">
        <Route className="h-4 w-4 text-purple-600" />
        <span>{load.load_id}: {load.origin} → {load.destination}</span>
        <span className={cn(
          "px-1.5 py-0.5 rounded text-xs font-medium",
          load.status === "delivered" ? "bg-green-100 text-green-700"
            : load.status === "in-transit" ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-600",
        )}>
          {load.status}
        </span>
      </div>

      <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-4">
        {events.map((event) => {
          const Icon = event.icon;
          const hasTime = !!event.time;
          return (
            <div key={event.type} className="relative">
              <div className={cn(
                "absolute -left-[31px] w-4 h-4 rounded-full border-2 flex items-center justify-center",
                hasTime ? "bg-white border-current" : "bg-muted border-muted-foreground/30",
                event.color,
              )}>
                {hasTime && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
              </div>
              <div className="flex items-start gap-2">
                <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", hasTime ? event.color : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", !hasTime && "text-muted-foreground")}>{event.label}</p>
                  {hasTime ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-muted-foreground">{formatDateTime(event.time)}</span>
                      <span className={cn(
                        "text-xs px-1 py-0.5 rounded",
                        event.source === "auto" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600",
                      )}>
                        {event.source === "auto" ? "GPS" : "Manual"}
                      </span>
                      {event.verified && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
                  )}
                </div>
              </div>
              {event.type === "loading_departure" && loadingDwell && (
                <div className="ml-6 mt-1 text-xs text-muted-foreground">
                  <Timer className="inline h-3 w-3 mr-1" />Loading dwell: {loadingDwell}
                </div>
              )}
              {event.type === "loading_departure" && transitTime && (
                <div className="ml-6 mt-1 text-xs text-blue-600">
                  <Truck className="inline h-3 w-3 mr-1" />Transit: {transitTime}
                </div>
              )}
              {event.type === "offloading_departure" && offloadingDwell && (
                <div className="ml-6 mt-1 text-xs text-muted-foreground">
                  <Timer className="inline h-3 w-3 mr-1" />Offloading dwell: {offloadingDwell}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geofence Event Log Item
// ---------------------------------------------------------------------------

function GeofenceEventItem({ event }: { event: DbGeofenceEvent }) {
  const config = EVENT_CONFIG[event.event_type] || {
    label: event.event_type,
    icon: MapPin,
    color: "text-gray-600",
  };
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        event.event_type.includes("arrival") ? "bg-blue-50" : "bg-green-50",
      )}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{config.label}</p>
          <span className={cn(
            "text-xs px-1 py-0.5 rounded",
            event.source === "auto" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600",
          )}>
            {event.source === "auto" ? "GPS" : "Manual"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3" />
          <span>{formatDateTime(event.event_time)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {event.geofence_name && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.geofence_name}
            </span>
          )}
          {event.load_number && (
            <span className="flex items-center gap-1">
              <Route className="h-3 w-3" />
              {event.load_number}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dialog
// ---------------------------------------------------------------------------

export function TripHistoryDialog({
  open,
  onOpenChange,
  asset,
  vehicleLoads = [],
}: TripHistoryDialogProps) {
  // Fetch geofence events from database
  const assetIdStr = asset?.id ? String(asset.id) : null;
  const vehicleName = asset?.name || asset?.code || "";
  const { data: eventsData, isLoading: eventsLoading } = useGeofenceEvents(
    vehicleName,
    assetIdStr,
    100,
  );
  const geofenceEvents = useMemo(
    () => eventsData?.events ?? [],
    [eventsData],
  );

  // Sort loads by most recent activity
  const sortedLoads = useMemo(() => {
    return [...vehicleLoads].sort((a, b) => {
      const aTime = a.actual_loading_arrival || a.loading_date || "";
      const bTime = b.actual_loading_arrival || b.loading_date || "";
      return bTime.localeCompare(aTime);
    });
  }, [vehicleLoads]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const groups = new Map<string, DbGeofenceEvent[]>();
    for (const event of geofenceEvents) {
      try {
        const dateKey = format(new Date(event.event_time), "dd MMM yyyy");
        if (!groups.has(dateKey)) groups.set(dateKey, []);
        groups.get(dateKey)!.push(event);
      } catch {
        // skip malformed dates
      }
    }
    return groups;
  }, [geofenceEvents]);

  const displayVehicleName = asset?.name || asset?.code || `Vehicle ${asset?.id}`;

  // Determine if we have any data to show
  const hasLoadData = sortedLoads.some(
    (l) => l.actual_loading_arrival || l.actual_loading_departure ||
      l.actual_offloading_arrival || l.actual_offloading_departure,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {displayVehicleName} — Trip History
          </DialogTitle>
          <DialogDescription className="sr-only">
            Geofence entry and exit history for {displayVehicleName}
          </DialogDescription>
          {asset && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{Math.round(asset.speedKmH)} km/h</span>
              <span>•</span>
              <span>{asset.inTrip ? "Moving" : "Parked"}</span>
              <span>•</span>
              <span>Last seen: {formatLastConnected(asset.lastConnectedUtc)}</span>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Section 1: Load-based Geofence Entry/Exit Times */}
            {sortedLoads.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Geofence Entry & Exit Times (by Load)
                </h3>
                {hasLoadData ? (
                  <div className="space-y-4">
                    {sortedLoads.map((load) => (
                      <Card key={load.id} className="shadow-sm">
                        <CardContent className="pt-4 pb-3">
                          <GeofenceTimeline load={load} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
                    <MapPin className="h-6 w-6 mx-auto mb-1 opacity-40" />
                    <p>No geofence events recorded yet for current loads.</p>
                    <p className="text-xs mt-1">Events are captured automatically when vehicles enter/exit depot geofences.</p>
                  </div>
                )}
              </div>
            )}

            {sortedLoads.length > 0 && geofenceEvents.length > 0 && <Separator />}

            {/* Section 2: Historical Geofence Event Log */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Geofence Event Log
              </h3>

              {eventsLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading event history...
                </div>
              )}

              {!eventsLoading && geofenceEvents.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-1 opacity-40" />
                  <p>No geofence events recorded yet.</p>
                  <p className="text-xs mt-1">
                    Events will appear here as the geofence monitor detects vehicles entering and exiting depots.
                  </p>
                </div>
              )}

              {!eventsLoading && geofenceEvents.length > 0 && (
                <div className="space-y-4">
                  {Array.from(eventsByDate.entries()).map(([dateLabel, events]) => (
                    <div key={dateLabel}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 pl-1">
                        {dateLabel}
                      </p>
                      <div className="border rounded-lg divide-y">
                        {events.map((event) => (
                          <div key={event.id} className="px-3">
                            <GeofenceEventItem event={event} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* No data at all */}
            {sortedLoads.length === 0 && !eventsLoading && geofenceEvents.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No trip history available</p>
                <p className="text-xs mt-1">
                  This vehicle has no linked loads or recorded geofence events yet.
                  <br />
                  Events will be captured automatically as the vehicle travels between depots.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}