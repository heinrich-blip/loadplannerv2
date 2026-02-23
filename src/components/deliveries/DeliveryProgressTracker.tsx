import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/waypoints";
import
    {
        AlertCircle,
        Clock,
        Gauge,
        MapPin,
        Navigation,
        Truck,
    } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import
    {
        Tooltip,
        TooltipContent,
        TooltipProvider,
        TooltipTrigger,
    } from "../ui/tooltip";

export interface TruckPosition {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  lastUpdate: string;
  isMoving: boolean;
}

export interface ProgressData {
  progress: number;
  totalDistance: number;
  distanceTraveled: number;
  distanceRemaining: number;
  etaFormatted: string;
  durationFormatted: string;
  originName?: string;
  destinationName?: string;
  isAtOrigin?: boolean;
  isAtDestination?: boolean;
  nearestDepot?: string | null;
}

export interface DeliveryProgressData {
  loadId: string;
  origin: string;
  destination: string;
  status: string;
  loadingDate: string;
  offloadingDate: string;
  vehicleId?: string;
  driverName?: string;
  truckPosition?: TruckPosition | null;
  progressData?: ProgressData | null;
}

interface DeliveryProgressTrackerProps {
  delivery: DeliveryProgressData;
  showDetails?: boolean;
  className?: string;
}

export function DeliveryProgressTracker({
  delivery,
  showDetails = true,
  className,
}: DeliveryProgressTrackerProps) {
  const progressData = delivery.progressData;

  if (!progressData) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Unable to calculate progress - depot not found for this route.
              Check origin/destination names match configured depots.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = progressData.progress;
  const originName = progressData.originName || delivery.origin;
  const destinationName = progressData.destinationName || delivery.destination;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Delivery Progress
          </CardTitle>
          {delivery.vehicleId && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {delivery.vehicleId}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar Section */}
        <div className="space-y-3">
          {/* Route Header */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="font-medium truncate max-w-[120px]">
                {originName}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center px-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{formatDistance(progressData.totalDistance)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium truncate max-w-[120px]">
                {destinationName}
              </span>
              <div className="w-3 h-3 rounded-full bg-blue-500" />
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="relative">
            {/* Background Track */}
            <div className="relative h-10 bg-muted rounded-full overflow-hidden">
              {/* Progress Fill */}
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500",
                  delivery.status === "delivered"
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : "bg-gradient-to-r from-emerald-400 via-blue-400 to-blue-500"
                )}
                style={{ width: `${progress}%` }}
              />

              {/* Origin Marker */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center z-10 shadow-lg">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{originName}</p>
                      <p className="text-xs text-muted-foreground">
                        Loading Location (Fixed Depot)
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Truck Position */}
              {delivery.truckPosition && progress > 0 && progress < 100 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-600 border-4 border-background flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all"
                        style={{ left: `${progress}%` }}
                      >
                        <Truck
                          className={cn(
                            "h-5 w-5 text-white",
                            delivery.truckPosition.isMoving && "animate-pulse"
                          )}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2">
                        <p className="font-medium">Telematics Position</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Speed:
                            </span>{" "}
                            {delivery.truckPosition.speed} km/h
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Heading:
                            </span>{" "}
                            {delivery.truckPosition.heading}°
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">
                              Updated:
                            </span>{" "}
                            {delivery.truckPosition.lastUpdate}
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">
                              Coords:
                            </span>{" "}
                            {delivery.truckPosition.latitude.toFixed(4)},{" "}
                            {delivery.truckPosition.longitude.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Destination Marker */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500 border-4 border-background flex items-center justify-center z-10 shadow-lg">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{destinationName}</p>
                      <p className="text-xs text-muted-foreground">
                        Offloading Location (Fixed Depot)
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Progress Percentage */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
              <Badge
                variant={
                  delivery.status === "delivered" ? "default" : "secondary"
                }
                className={cn(
                  "text-xs font-bold",
                  delivery.status === "delivered" && "bg-emerald-500"
                )}
              >
                {Math.round(progress)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {showDetails && (
          <div className="pt-6 grid grid-cols-4 gap-3">
            {/* Distance Traveled */}
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Traveled</div>
              <div className="font-semibold text-sm">
                {formatDistance(progressData.distanceTraveled)}
              </div>
            </div>

            {/* Distance Remaining */}
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">
                Remaining
              </div>
              <div className="font-semibold text-sm">
                {formatDistance(progressData.distanceRemaining)}
              </div>
            </div>

            {/* ETA */}
            <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                ETA
              </div>
              <div className="font-semibold text-sm text-red-600 dark:text-red-400">
                {delivery.status === "delivered"
                  ? "Delivered"
                  : progressData.etaFormatted}
              </div>
            </div>

            {/* Speed */}
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Gauge className="h-3 w-3" />
                Speed
              </div>
              <div className="font-semibold text-sm">
                {delivery.truckPosition?.speed || 0} km/h
              </div>
            </div>
          </div>
        )}

        {/* Telematics Status */}
        {delivery.truckPosition && showDetails && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-sm">
            <Navigation className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium">
              {progressData.isAtDestination
                ? "At Destination"
                : progressData.isAtOrigin
                  ? "At Origin"
                  : delivery.truckPosition.isMoving
                    ? "In Transit"
                    : "Stationary"}
            </span>
            {progressData.nearestDepot && !progressData.isAtOrigin && !progressData.isAtDestination && (
              <span className="text-xs text-muted-foreground">
                (near {progressData.nearestDepot})
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              Last update: {delivery.truckPosition.lastUpdate}
            </span>
          </div>
        )}

        {/* Journey Time Estimate */}
        {showDetails && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Est. travel time: {progressData.durationFormatted}</span>
            <span className="flex items-center gap-1 text-emerald-600">
              <MapPin className="h-3 w-3" />
              Fixed Depot Coordinates
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for list items
export function DeliveryProgressBar({
  delivery,
  className,
}: {
  delivery: DeliveryProgressData;
  className?: string;
}) {
  const progressData = delivery.progressData;

  if (!progressData) return null;

  const progress = progressData.progress;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500",
            delivery.status === "delivered"
              ? "bg-emerald-500"
              : "bg-gradient-to-r from-emerald-400 to-blue-500"
          )}
          style={{ width: `${progress}%` }}
        />
        {delivery.truckPosition &&
          progress > 5 &&
          progress < 95 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-600 border-2 border-background"
              style={{ left: `${progress}%` }}
            />
          )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatDistance(progressData.distanceRemaining)} to go</span>
        <span className="text-red-600 font-medium">
          ETA: {progressData.etaFormatted}
        </span>
      </div>
    </div>
  );
}