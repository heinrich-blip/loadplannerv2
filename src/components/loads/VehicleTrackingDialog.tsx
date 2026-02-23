import { Button } from '@/components/ui/button';
import
  {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import type { Load } from '@/hooks/useLoads';
import { createShareableTrackingLink, formatShareMessage, type ShareMessageStyle } from '@/lib/shareTracking';
import
  {
    formatLastConnected,
    getAssetDetails,
    getHeadingDirection,
    getStatusColor,
    isAuthenticated,
    type TelematicsAsset,
  } from '@/lib/telematicsGuru';
import { getLocationDisplayName } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, Clock, Copy, ExternalLink, Link2, Loader2, MapPin, MessageCircle, Navigation, Share2, Truck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { toast } from 'sonner';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create vehicle marker icon
function createVehicleIcon(asset: TelematicsAsset): L.DivIcon {
  const color = getStatusColor(asset);
  const rotation = asset.heading || 0;

  return L.divIcon({
    html: `
      <div style="width:48px;height:48px;position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="
          width:40px;height:40px;border-radius:50%;background:${color};
          border:4px solid white;display:flex;align-items:center;justify-content:center;
          box-shadow:0 4px 12px rgba(0,0,0,0.3);transform:rotate(${rotation}deg);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L12 22M12 2L5 9M12 2L19 9"/>
          </svg>
        </div>
        ${
          asset.inTrip
            ? `<div style="position:absolute;top:0;right:0;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;animation:pulse 1.5s infinite;"></div>`
            : ''
        }
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7}}</style>
    `,
    className: 'vehicle-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// Center map on vehicle
function CenterOnVehicle({ asset }: { asset: TelematicsAsset | null }) {
  const map = useMap();

  useEffect(() => {
    // Guard: ensure map is fully initialized
    if (!map || !map.getContainer()) return;

    if (asset?.lastLatitude && asset?.lastLongitude) {
      try {
        map.setView([asset.lastLatitude, asset.lastLongitude], 14);
      } catch (error) {
        console.warn('CenterOnVehicle error:', error);
      }
    }
  }, [asset, map]);

  return null;
}

interface VehicleTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: Load | null;
  telematicsAssetId?: string | null;
}

export function VehicleTrackingDialog({
  open,
  onOpenChange,
  load,
  telematicsAssetId,
}: VehicleTrackingDialogProps) {
  const [asset, setAsset] = useState<TelematicsAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchVehiclePosition = useCallback(async () => {
    if (!telematicsAssetId) {
      setError('No telematics ID linked to this vehicle');
      return;
    }

    if (!isAuthenticated()) {
      setError('Please connect to Telematics Guru first via Live Tracking page');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const assetData = await getAssetDetails(parseInt(telematicsAssetId));
      setAsset(assetData);
      setLastUpdate(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch vehicle position';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [telematicsAssetId]);

  // Fetch on open
  useEffect(() => {
    if (open && telematicsAssetId) {
      fetchVehiclePosition();
    }
  }, [open, telematicsAssetId, fetchVehiclePosition]);

  // Auto-refresh every 30 seconds when dialog is open
  useEffect(() => {
    if (!open || !telematicsAssetId) return;

    const interval = setInterval(fetchVehiclePosition, 30000);
    return () => clearInterval(interval);
  }, [open, telematicsAssetId, fetchVehiclePosition]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setAsset(null);
      setError(null);
      setLastUpdate(null);
    }
  }, [open]);

  // Generate Google Maps URL
  const getGoogleMapsUrl = useCallback(() => {
    if (!asset?.lastLatitude || !asset?.lastLongitude) return null;
    return `https://www.google.com/maps?q=${asset.lastLatitude},${asset.lastLongitude}`;
  }, [asset]);

  // Generate Google Maps directions URL
  const getDirectionsUrl = useCallback(() => {
    if (!asset?.lastLatitude || !asset?.lastLongitude) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${asset.lastLatitude},${asset.lastLongitude}`;
  }, [asset]);

  // Copy coordinates to clipboard
  const copyCoordinates = useCallback(async () => {
    if (!asset?.lastLatitude || !asset?.lastLongitude) return;
    const coords = `${asset.lastLatitude}, ${asset.lastLongitude}`;
    try {
      await navigator.clipboard.writeText(coords);
      toast.success('Coordinates copied to clipboard');
    } catch {
      toast.error('Failed to copy coordinates');
    }
  }, [asset]);

  // Copy shareable link (static Google Maps)
  const copyShareableLink = useCallback(async () => {
    const url = getGoogleMapsUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Location link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getGoogleMapsUrl]);

  // Open in Google Maps
  const openInGoogleMaps = useCallback(() => {
    const url = getGoogleMapsUrl();
    if (url) window.open(url, '_blank');
  }, [getGoogleMapsUrl]);

  // Create live tracking link with expiry
  const [creatingLiveLink, setCreatingLiveLink] = useState(false);
  
  const createLiveTrackingLink = useCallback(async (expiryHours: number) => {
    if (!load?.id || !telematicsAssetId) {
      toast.error('Cannot create live link: missing load or vehicle data');
      return;
    }

    setCreatingLiveLink(true);
    try {
      const result = await createShareableTrackingLink({
        loadId: load.id,
        telematicsAssetId,
        expiryHours,
      });

      await navigator.clipboard.writeText(result.shareUrl);
      toast.success(`Live tracking link created! Valid for ${expiryHours} hours. Link copied to clipboard.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create live link';
      toast.error(message);
    } finally {
      setCreatingLiveLink(false);
    }
  }, [load, telematicsAssetId]);

  // Share via WhatsApp with full details and style options
  const shareViaWhatsApp = useCallback(async (
    withLiveLink: boolean = false, 
    style: ShareMessageStyle = 'professional'
  ) => {
    if (!asset?.lastLatitude || !asset?.lastLongitude || !load) return;

    let shareUrl: string | undefined;
    
    if (withLiveLink && telematicsAssetId) {
      try {
        const result = await createShareableTrackingLink({
          loadId: load.id,
          telematicsAssetId,
          expiryHours: 24, // Default 24 hours for WhatsApp shares
        });
        shareUrl = result.shareUrl;
      } catch (err) {
        console.error('Failed to create live link for WhatsApp share:', err);
      }
    }

    const message = formatShareMessage(
      {
        load_id: load.load_id,
        origin: load.origin,
        destination: load.destination,
        loading_date: load.loading_date,
        offloading_date: load.offloading_date,
        cargo_type: load.cargo_type,
        status: load.status,
        driver: load.driver,
        fleet_vehicle: load.fleet_vehicle,
      },
      {
        name: asset.name || asset.code,
        speedKmH: asset.speedKmH,
        inTrip: asset.inTrip,
        latitude: asset.lastLatitude,
        longitude: asset.lastLongitude,
      },
      shareUrl,
      style
    );

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }, [asset, load, telematicsAssetId]);

  // Copy detailed message to clipboard with style options
  const copyDetailedMessage = useCallback(async (
    withLiveLink: boolean = false,
    style: ShareMessageStyle = 'professional'
  ) => {
    if (!asset?.lastLatitude || !asset?.lastLongitude || !load) return;

    let shareUrl: string | undefined;
    
    if (withLiveLink && telematicsAssetId) {
      try {
        const result = await createShareableTrackingLink({
          loadId: load.id,
          telematicsAssetId,
          expiryHours: 24,
        });
        shareUrl = result.shareUrl;
      } catch (err) {
        console.error('Failed to create live link:', err);
      }
    }

    const message = formatShareMessage(
      {
        load_id: load.load_id,
        origin: load.origin,
        destination: load.destination,
        loading_date: load.loading_date,
        offloading_date: load.offloading_date,
        cargo_type: load.cargo_type,
        status: load.status,
        driver: load.driver,
        fleet_vehicle: load.fleet_vehicle,
      },
      {
        name: asset.name || asset.code,
        speedKmH: asset.speedKmH,
        inTrip: asset.inTrip,
        latitude: asset.lastLatitude,
        longitude: asset.lastLongitude,
      },
      shareUrl,
      style
    );

    try {
      // Remove markdown formatting for clipboard
      const plainMessage = message.replace(/\*/g, '');
      await navigator.clipboard.writeText(plainMessage);
      toast.success('Full tracking details copied to clipboard');
    } catch {
      toast.error('Failed to copy message');
    }
  }, [asset, load, telematicsAssetId]);

  const defaultCenter: [number, number] = [-19.0, 31.0]; // Zimbabwe

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Track Vehicle - {load?.load_id}
          </DialogTitle>
          <DialogDescription>
            {load?.fleet_vehicle?.vehicle_id || 'Unknown Vehicle'} • {load?.origin} → {load?.destination}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 p-6 pt-4 flex flex-col gap-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
            <div className="flex items-center gap-4">
              {asset && (
                <>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStatusColor(asset) }}
                    />
                    <span className="text-sm font-medium">
                      {asset.inTrip ? 'Moving' : 'Stationary'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {asset.speedKmH} km/h • {getHeadingDirection(asset.heading || 0)}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              
              {/* Share/Export Dropdown */}
              {asset && asset.lastLatitude && asset.lastLongitude && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={creatingLiveLink}>
                      {creatingLiveLink ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4 mr-1" />
                      )}
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Live Tracking Links */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Link2 className="w-4 h-4 mr-2" />
                        Create Live Tracking Link
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => createLiveTrackingLink(4)}>
                          <Clock className="w-4 h-4 mr-2" />
                          Valid for 4 hours
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => createLiveTrackingLink(12)}>
                          <Clock className="w-4 h-4 mr-2" />
                          Valid for 12 hours
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => createLiveTrackingLink(24)}>
                          <Clock className="w-4 h-4 mr-2" />
                          Valid for 24 hours
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => createLiveTrackingLink(48)}>
                          <Clock className="w-4 h-4 mr-2" />
                          Valid for 48 hours
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => createLiveTrackingLink(72)}>
                          <Clock className="w-4 h-4 mr-2" />
                          Valid for 72 hours
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* WhatsApp Sharing */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Share via WhatsApp
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Professional (Recommended)
                        </div>
                        <DropdownMenuItem onClick={() => shareViaWhatsApp(true, 'professional')}>
                          <Truck className="w-4 h-4 mr-2" />
                          📊 Full branded message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Other Formats
                        </div>
                        <DropdownMenuItem onClick={() => shareViaWhatsApp(true, 'detailed')}>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          📋 Detailed (internal use)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareViaWhatsApp(true, 'compact')}>
                          <MapPin className="w-4 h-4 mr-2" />
                          ⚡ Compact summary
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareViaWhatsApp(false, 'minimal')}>
                          <Navigation className="w-4 h-4 mr-2" />
                          📍 Quick location share
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* Copy Options */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy to Clipboard
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52">
                        <DropdownMenuItem onClick={() => copyDetailedMessage(true, 'professional')}>
                          <Truck className="w-4 h-4 mr-2" />
                          Professional format
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyDetailedMessage(true, 'detailed')}>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Detailed format
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyDetailedMessage(true, 'compact')}>
                          <MapPin className="w-4 h-4 mr-2" />
                          Compact format
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={copyShareableLink}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Google Maps link only
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={copyCoordinates}>
                          <Navigation className="w-4 h-4 mr-2" />
                          GPS coordinates only
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* External Actions */}
                    <DropdownMenuItem onClick={openInGoogleMaps}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in Google Maps
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const url = getDirectionsUrl();
                      if (url) window.open(url, '_blank');
                    }}>
                      <Navigation className="w-4 h-4 mr-2" />
                      Get Directions
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={fetchVehiclePosition}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Map */}
          <div className="flex-1 rounded-lg overflow-hidden border">
            {!telematicsAssetId ? (
              <div className="h-full flex flex-col items-center justify-center bg-muted/30">
                <Truck className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No telematics ID linked to this vehicle.<br />
                  <span className="text-sm">Update the vehicle in Fleet Management to add tracking.</span>
                </p>
              </div>
            ) : loading && !asset ? (
              <div className="h-full flex items-center justify-center bg-muted/30">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MapContainer
                center={
                  asset?.lastLatitude && asset?.lastLongitude
                    ? [asset.lastLatitude, asset.lastLongitude]
                    : defaultCenter
                }
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">Carto</a>'
                />
                {asset && asset.lastLatitude && asset.lastLongitude && (
                  <Marker
                    position={[asset.lastLatitude, asset.lastLongitude]}
                    icon={createVehicleIcon(asset)}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold text-lg mb-2">
                          {asset.name || asset.code || `Vehicle ${asset.id}`}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Load:</span>
                            <span>{load?.load_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Route:</span>
                            <span>{load?.origin} → {load?.destination}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Speed:</span>
                            <span>{asset.speedKmH} km/h</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Heading:</span>
                            <span>{getHeadingDirection(asset.heading || 0)} ({asset.heading}°)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Last seen:</span>
                            <span>{formatLastConnected(asset.lastConnectedUtc)}</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
                <CenterOnVehicle asset={asset} />
              </MapContainer>
            )}
          </div>

          {/* Load Info Footer */}
          {load && (
            <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-4 py-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span>{getLocationDisplayName(load.origin)}</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>{getLocationDisplayName(load.destination)}</span>
                </div>
              </div>
              <div className="text-muted-foreground">
                Driver: {load.driver?.name || 'Unassigned'}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}