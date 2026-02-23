import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import
  {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { Driver } from '@/hooks/useDrivers';
import { cn } from '@/lib/utils';
import { addDays, format, isBefore, isPast, parseISO } from 'date-fns';
import
  {
    AlertTriangle,
    Calendar,
    CreditCard,
    ExternalLink,
    FileText,
    Heart,
    Phone
  } from 'lucide-react';

interface ViewDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set';
  if (dateString === '9999-12-31') return 'N/A';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy');
  } catch {
    return 'Invalid date';
  }
}

function getExpiryStatus(dateString: string | null | undefined): 'expired' | 'warning' | 'ok' | null {
  if (!dateString) return null;
  if (dateString === '9999-12-31') return null; // N/A doesn't trigger any status
  try {
    const date = parseISO(dateString);
    const today = new Date();
    if (isPast(date)) return 'expired';
    if (isBefore(date, addDays(today, 30))) return 'warning';
    return 'ok';
  } catch {
    return null;
  }
}

function DocumentItem({
  label,
  value,
  expiryDate,
  documentUrl,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  expiryDate?: string | null | undefined;
  documentUrl?: string | null | undefined;
  icon: React.ElementType;
}) {
  const status = expiryDate ? getExpiryStatus(expiryDate) : null;

  return (
    <div className="py-2 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </div>
        <span className="text-sm font-medium text-foreground">
          {value || 'Not set'}
        </span>
      </div>
      {expiryDate !== undefined && (
        <div className="flex items-center justify-between pl-6">
          <span className="text-xs text-muted-foreground">Expiry</span>
          <div className="flex items-center gap-2">
            {status === 'expired' && (
              <AlertTriangle className="h-3 w-3 text-destructive" />
            )}
            {status === 'warning' && (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                status === 'expired' && 'text-destructive',
                status === 'warning' && 'text-amber-500',
                status === 'ok' && 'text-foreground',
                !status && 'text-muted-foreground'
              )}
            >
              {formatDate(expiryDate)}
            </span>
          </div>
        </div>
      )}
      {documentUrl && (
        <div className="pl-6">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary"
            onClick={() => window.open(documentUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Document
          </Button>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">
        {value || 'Not set'}
      </span>
    </div>
  );
}

function ExpiryDateItem({
  label,
  date,
  documentUrl,
  icon: Icon,
}: {
  label: string;
  date: string | null | undefined;
  documentUrl?: string | null | undefined;
  icon: React.ElementType;
}) {
  const status = getExpiryStatus(date);

  return (
    <div className="py-2 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'expired' && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
          {status === 'warning' && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              status === 'expired' && 'text-destructive',
              status === 'warning' && 'text-amber-500',
              status === 'ok' && 'text-foreground',
              !status && 'text-muted-foreground'
            )}
          >
            {formatDate(date)}
          </span>
        </div>
      </div>
      {documentUrl && (
        <div className="pl-6">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary"
            onClick={() => window.open(documentUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Document
          </Button>
        </div>
      )}
    </div>
  );
}

export function ViewDriverDialog({
  open,
  onOpenChange,
  driver,
}: ViewDriverDialogProps) {
  if (!driver) return null;

  const initials = driver.name
    ? driver.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '??';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              {driver.photo_url ? (
                <AvatarImage src={driver.photo_url} alt={driver.name} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl font-bold">{driver.name}</DialogTitle>
              <Badge
                variant="outline"
                className={cn(
                  'mt-1',
                  driver.available
                    ? 'bg-status-scheduled-bg text-status-scheduled border-status-scheduled/20'
                    : 'bg-status-transit-bg text-status-transit border-status-transit/20'
                )}
              >
                {driver.available ? 'Available' : 'On Route'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Contact Information
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3">
              <DetailItem label="Phone" value={driver.contact} icon={Phone} />
            </div>
          </div>

          {/* Identity Documents */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Identity Documents
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3">
              <DocumentItem
                label="ID Number"
                value={driver.id_number}
                documentUrl={driver.id_doc_url}
                icon={CreditCard}
              />
              <Separator className="my-1" />
              <DocumentItem
                label="Passport Number"
                value={driver.passport_number}
                expiryDate={driver.passport_expiry}
                documentUrl={driver.passport_doc_url}
                icon={FileText}
              />
            </div>
          </div>

          {/* Licenses & Certificates */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Licenses & Certificates
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3">
              <DocumentItem
                label="Driver's License"
                value={driver.drivers_license}
                expiryDate={driver.drivers_license_expiry}
                documentUrl={driver.drivers_license_doc_url}
                icon={CreditCard}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="Retest Certificate"
                date={driver.retest_certificate_expiry}
                documentUrl={driver.retest_certificate_doc_url}
                icon={Calendar}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="Medical Certificate"
                date={driver.medical_certificate_expiry}
                documentUrl={driver.medical_certificate_doc_url}
                icon={Heart}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="International Driving Permit"
                date={driver.international_driving_permit_expiry}
                documentUrl={driver.international_driving_permit_doc_url}
                icon={Calendar}
              />
              <Separator className="my-1" />
              <ExpiryDateItem
                label="Defensive Driving Permit"
                date={driver.defensive_driving_permit_expiry}
                documentUrl={driver.defensive_driving_permit_doc_url}
                icon={Calendar}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Created: {formatDate(driver.created_at)}</div>
            <div>Last Updated: {formatDate(driver.updated_at)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ViewDriverDialog;