import { Button } from "@/components/ui/button";
import
  {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import
  {
    ExpiryAlert,
    MissingDocument,
    useExpiryAlerts,
  } from "@/hooks/useExpiryAlerts";
import
  {
    exportDriverExpiryAlertsToExcel,
    exportExpiryAlertsToExcel,
    exportMissingDocumentsToExcel,
    exportVehicleExpiryAlertsToExcel,
  } from "@/lib/exportExpiryAlerts";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import
  {
    AlertTriangle,
    Bell,
    CalendarX,
    Clock,
    Download,
    FileWarning,
    FileX,
    Truck,
    User,
  } from "lucide-react";

function AlertItem({ alert }: { alert: ExpiryAlert }) {
  const statusColors = {
    expired: "text-red-600 bg-red-50 border-red-200",
    critical: "text-orange-600 bg-orange-50 border-orange-200",
    warning: "text-amber-600 bg-amber-50 border-amber-200",
    upcoming: "text-blue-600 bg-blue-50 border-blue-200",
  };

  const statusLabels = {
    expired: "Expired",
    critical: "Critical",
    warning: "Warning",
    upcoming: "Upcoming",
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border mb-2 last:mb-0",
        statusColors[alert.status],
      )}
    >
      <div className="flex items-start gap-2">
        {alert.type === "driver" ? (
          <User className="h-4 w-4 mt-0.5 shrink-0" />
        ) : (
          <Truck className="h-4 w-4 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {alert.entityName}
            </span>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-current/10">
              {statusLabels[alert.status]}
            </span>
          </div>
          <p className="text-xs mt-0.5 opacity-80">{alert.documentLabel}</p>
          <p className="text-xs mt-1">
            {alert.daysUntilExpiry < 0 ? (
              <>Expired {Math.abs(alert.daysUntilExpiry)} days ago</>
            ) : alert.daysUntilExpiry === 0 ? (
              <>Expires today</>
            ) : (
              <>Expires in {alert.daysUntilExpiry} days</>
            )}
            <span className="opacity-60">
              {" "}
              • {format(parseISO(alert.expiryDate), "dd/MM/yyyy")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function MissingDocItem({ doc }: { doc: MissingDocument }) {
  return (
    <div className="p-3 rounded-lg border mb-2 last:mb-0 text-slate-600 bg-slate-50 border-slate-200">
      <div className="flex items-start gap-2">
        {doc.type === "driver" ? (
          <User className="h-4 w-4 mt-0.5 shrink-0" />
        ) : (
          <Truck className="h-4 w-4 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {doc.entityName}
            </span>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-200 flex items-center gap-1">
              {doc.missingType === "no_document" ? (
                <>
                  <FileX className="h-3 w-3" />
                  No File
                </>
              ) : (
                <>
                  <CalendarX className="h-3 w-3" />
                  No Date
                </>
              )}
            </span>
          </div>
          <p className="text-xs mt-0.5 opacity-80">{doc.documentLabel}</p>
          <p className="text-xs mt-1 opacity-60">
            {doc.missingType === "no_document"
              ? "Document not uploaded"
              : "Expiry date not set"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const {
    alerts,
    missingDocuments,
    driverAlerts,
    vehicleAlerts,
    expiredCount,
    criticalCount,
    totalCount,
    missingCount,
    isLoading,
  } = useExpiryAlerts();

  const hasUrgent = expiredCount > 0 || criticalCount > 0;
  const badgeCount = expiredCount + criticalCount + missingCount;
  const hasAnyAlerts = totalCount > 0 || missingCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell
            className={cn(
              "h-5 w-5",
              hasUrgent
                ? "text-orange-500"
                : missingCount > 0
                  ? "text-slate-500"
                  : "text-muted-foreground",
            )}
          />
          {badgeCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white",
                expiredCount > 0
                  ? "bg-red-500"
                  : criticalCount > 0
                    ? "bg-orange-500"
                    : "bg-slate-500",
              )}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Document Alerts</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading alerts...
          </div>
        ) : !hasAnyAlerts ? (
          <div className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No document alerts at this time
            </p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="expiring" className="w-full">
              <TabsList
                className="w-full grid grid-cols-2 mx-2 mb-2"
                style={{ width: "calc(100% - 16px)" }}
              >
                <TabsTrigger value="expiring" className="text-xs">
                  Expiring ({totalCount})
                </TabsTrigger>
                <TabsTrigger value="missing" className="text-xs">
                  Missing ({missingCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="expiring" className="mt-0">
                {totalCount === 0 ? (
                  <div className="p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No expiring documents
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px] px-2">
                    <div className="py-2">
                      {alerts.slice(0, 15).map((alert) => (
                        <AlertItem key={alert.id} alert={alert} />
                      ))}
                      {alerts.length > 15 && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          +{alerts.length - 15} more alerts
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="missing" className="mt-0">
                {missingCount === 0 ? (
                  <div className="p-4 text-center">
                    <FileWarning className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      All documents uploaded with dates set
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[250px] px-2">
                    <div className="py-2">
                      {missingDocuments.slice(0, 15).map((doc) => (
                        <MissingDocItem key={doc.id} doc={doc} />
                      ))}
                      {missingDocuments.length > 15 && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          +{missingDocuments.length - 15} more items
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>

            <DropdownMenuSeparator />

            <div className="p-2 space-y-1">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                Download Reports
              </DropdownMenuLabel>
              {totalCount > 0 && (
                <DropdownMenuItem
                  onClick={() => exportExpiryAlertsToExcel(alerts)}
                  className="gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>All Expiring Documents ({totalCount})</span>
                </DropdownMenuItem>
              )}
              {driverAlerts.length > 0 && (
                <DropdownMenuItem
                  onClick={() => exportDriverExpiryAlertsToExcel(alerts)}
                  className="gap-2 cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>Driver Expiring ({driverAlerts.length})</span>
                </DropdownMenuItem>
              )}
              {vehicleAlerts.length > 0 && (
                <DropdownMenuItem
                  onClick={() => exportVehicleExpiryAlertsToExcel(alerts)}
                  className="gap-2 cursor-pointer"
                >
                  <Truck className="h-4 w-4" />
                  <span>Vehicle Expiring ({vehicleAlerts.length})</span>
                </DropdownMenuItem>
              )}
              {missingCount > 0 && (
                <DropdownMenuItem
                  onClick={() =>
                    exportMissingDocumentsToExcel(missingDocuments)
                  }
                  className="gap-2 cursor-pointer"
                >
                  <FileX className="h-4 w-4" />
                  <span>Missing Documents ({missingCount})</span>
                </DropdownMenuItem>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}