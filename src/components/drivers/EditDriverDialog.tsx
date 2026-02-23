import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import
  {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
import
  {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type DocumentType, uploadDriverDocument } from '@/hooks/useDriverDocuments';
import { type Driver, useUpdateDriver } from '@/hooks/useDrivers';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Camera, ExternalLink, FileText, Pencil, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact: z.string().min(6, 'Contact must be at least 6 characters'),
  available: z.boolean(),
  passport_number: z.string().optional(),
  passport_expiry: z.date().optional(),
  id_number: z.string().optional(),
  drivers_license: z.string().optional(),
  drivers_license_expiry: z.date().optional(),
  retest_certificate_expiry: z.date().optional(),
  medical_certificate_expiry: z.date().optional(),
  international_driving_permit_expiry: z.date().optional(),
  defensive_driving_permit_expiry: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DocumentUpload {
  file: File | null;
  preview: string | null;
}

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
}

export function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  const updateDriver = useUpdateDriver();
  const [isUploading, setIsUploading] = useState(false);

  // N/A checkbox states for each expiry date
  const [passportExpiryNA, setPassportExpiryNA] = useState(false);
  const [driversLicenseExpiryNA, setDriversLicenseExpiryNA] = useState(false);
  const [retestCertificateExpiryNA, setRetestCertificateExpiryNA] = useState(false);
  const [medicalCertificateExpiryNA, setMedicalCertificateExpiryNA] = useState(false);
  const [internationalPermitExpiryNA, setInternationalPermitExpiryNA] = useState(false);
  const [defensivePermitExpiryNA, setDefensivePermitExpiryNA] = useState(false);

  // Document upload states
  const [photoUpload, setPhotoUpload] = useState<DocumentUpload>({ file: null, preview: null });
  const [passportDocUpload, setPassportDocUpload] = useState<DocumentUpload>({ file: null, preview: null });
  const [idDocUpload, setIdDocUpload] = useState<DocumentUpload>({ file: null, preview: null });
  const [licenseDocUpload, setLicenseDocUpload] = useState<DocumentUpload>({ file: null, preview: null });
  const [retestDocUpload, setRetestDocUpload] = useState<DocumentUpload>({ file: null, preview: null });
  const [medicalDocUpload, setMedicalDocUpload] = useState<DocumentUpload>({ file: null, preview: null });
  const [internationalPermitDocUpload, setInternationalPermitDocUpload] = useState<DocumentUpload>({ file: null, preview: null });
  const [defensivePermitDocUpload, setDefensivePermitDocUpload] = useState<DocumentUpload>({ file: null, preview: null });

  // File input refs - Fix: Use HTMLInputElement (non-nullable)
  const photoInputRef = useRef<HTMLInputElement>(null);
  const passportDocInputRef = useRef<HTMLInputElement>(null);
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const licenseDocInputRef = useRef<HTMLInputElement>(null);
  const retestDocInputRef = useRef<HTMLInputElement>(null);
  const medicalDocInputRef = useRef<HTMLInputElement>(null);
  const internationalPermitDocInputRef = useRef<HTMLInputElement>(null);
  const defensivePermitDocInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contact: '',
      available: true,
      passport_number: '',
      passport_expiry: undefined,
      id_number: '',
      drivers_license: '',
      drivers_license_expiry: undefined,
      retest_certificate_expiry: undefined,
      medical_certificate_expiry: undefined,
      international_driving_permit_expiry: undefined,
      defensive_driving_permit_expiry: undefined,
    },
  });

  // Reset form and uploads when driver changes
  useEffect(() => {
    if (driver && open) {
      // Use sentinel date 9999-12-31 to represent N/A
      const NA_DATE = '9999-12-31';
      
      // Set N/A states from existing data
      setPassportExpiryNA(driver.passport_expiry === NA_DATE);
      setDriversLicenseExpiryNA(driver.drivers_license_expiry === NA_DATE);
      setRetestCertificateExpiryNA(driver.retest_certificate_expiry === NA_DATE);
      setMedicalCertificateExpiryNA(driver.medical_certificate_expiry === NA_DATE);
      setInternationalPermitExpiryNA(driver.international_driving_permit_expiry === NA_DATE);
      setDefensivePermitExpiryNA(driver.defensive_driving_permit_expiry === NA_DATE);

      form.reset({
        name: driver.name,
        contact: driver.contact,
        available: driver.available,
        passport_number: driver.passport_number || '',
        passport_expiry: driver.passport_expiry && driver.passport_expiry !== NA_DATE ? parseISO(driver.passport_expiry) : undefined,
        id_number: driver.id_number || '',
        drivers_license: driver.drivers_license || '',
        drivers_license_expiry: driver.drivers_license_expiry && driver.drivers_license_expiry !== NA_DATE ? parseISO(driver.drivers_license_expiry) : undefined,
        retest_certificate_expiry: driver.retest_certificate_expiry && driver.retest_certificate_expiry !== NA_DATE ? parseISO(driver.retest_certificate_expiry) : undefined,
        medical_certificate_expiry: driver.medical_certificate_expiry && driver.medical_certificate_expiry !== NA_DATE ? parseISO(driver.medical_certificate_expiry) : undefined,
        international_driving_permit_expiry: driver.international_driving_permit_expiry && driver.international_driving_permit_expiry !== NA_DATE ? parseISO(driver.international_driving_permit_expiry) : undefined,
        defensive_driving_permit_expiry: driver.defensive_driving_permit_expiry && driver.defensive_driving_permit_expiry !== NA_DATE ? parseISO(driver.defensive_driving_permit_expiry) : undefined,
      });
      // Reset upload states
      setPhotoUpload({ file: null, preview: null });
      setPassportDocUpload({ file: null, preview: null });
      setIdDocUpload({ file: null, preview: null });
      setLicenseDocUpload({ file: null, preview: null });
      setRetestDocUpload({ file: null, preview: null });
      setMedicalDocUpload({ file: null, preview: null });
      setInternationalPermitDocUpload({ file: null, preview: null });
      setDefensivePermitDocUpload({ file: null, preview: null });
    }
  }, [driver, open, form]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setUpload: React.Dispatch<React.SetStateAction<DocumentUpload>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUpload({
          file,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearUpload = (
    setUpload: React.Dispatch<React.SetStateAction<DocumentUpload>>,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    setUpload({ file: null, preview: null });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSubmit = async (data: FormData) => {
    if (!driver) return;

    setIsUploading(true);

    try {
      // Upload any new documents
      const uploads: { type: DocumentType; file: File | null; field: string }[] = [
        { type: 'photo', file: photoUpload.file, field: 'photo_url' },
        { type: 'passport', file: passportDocUpload.file, field: 'passport_doc_url' },
        { type: 'id', file: idDocUpload.file, field: 'id_doc_url' },
        { type: 'drivers_license', file: licenseDocUpload.file, field: 'drivers_license_doc_url' },
        { type: 'retest_certificate', file: retestDocUpload.file, field: 'retest_certificate_doc_url' },
        { type: 'medical_certificate', file: medicalDocUpload.file, field: 'medical_certificate_doc_url' },
        { type: 'international_driving_permit', file: internationalPermitDocUpload.file, field: 'international_driving_permit_doc_url' },
        { type: 'defensive_driving_permit', file: defensivePermitDocUpload.file, field: 'defensive_driving_permit_doc_url' },
      ];

      const uploadPromises = uploads
        .filter((u) => u.file !== null)
        .map(async (u) => {
          const result = await uploadDriverDocument(driver.id, u.type, u.file!);
          return { field: u.field, url: result?.url || null };
        });

      const uploadResults = await Promise.all(uploadPromises);

      // Build update object
      // Use sentinel date 9999-12-31 for N/A (not applicable)
      const NA_DATE = '9999-12-31';
      const updateData: Record<string, unknown> = {
        id: driver.id,
        name: data.name,
        contact: data.contact,
        available: data.available,
        passport_number: data.passport_number || null,
        passport_expiry: passportExpiryNA ? NA_DATE : (data.passport_expiry ? format(data.passport_expiry, 'yyyy-MM-dd') : null),
        id_number: data.id_number || null,
        drivers_license: data.drivers_license || null,
        drivers_license_expiry: driversLicenseExpiryNA ? NA_DATE : (data.drivers_license_expiry ? format(data.drivers_license_expiry, 'yyyy-MM-dd') : null),
        retest_certificate_expiry: retestCertificateExpiryNA ? NA_DATE : (data.retest_certificate_expiry ? format(data.retest_certificate_expiry, 'yyyy-MM-dd') : null),
        medical_certificate_expiry: medicalCertificateExpiryNA ? NA_DATE : (data.medical_certificate_expiry ? format(data.medical_certificate_expiry, 'yyyy-MM-dd') : null),
        international_driving_permit_expiry: internationalPermitExpiryNA ? NA_DATE : (data.international_driving_permit_expiry ? format(data.international_driving_permit_expiry, 'yyyy-MM-dd') : null),
        defensive_driving_permit_expiry: defensivePermitExpiryNA ? NA_DATE : (data.defensive_driving_permit_expiry ? format(data.defensive_driving_permit_expiry, 'yyyy-MM-dd') : null),
      };

      // Add uploaded document URLs
      uploadResults.forEach((r) => {
        if (r.url) {
          updateData[r.field] = r.url;
        }
      });

      updateDriver.mutate(updateData as Parameters<typeof updateDriver.mutate>[0], {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    } finally {
      setIsUploading(false);
    }
  };

  const DocumentUploadField = ({
    label,
    icon: Icon,
    upload,
    setUpload,
    inputRef,
    existingUrl,
    accept = 'image/*,.pdf',
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    upload: DocumentUpload;
    setUpload: React.Dispatch<React.SetStateAction<DocumentUpload>>;
    inputRef: React.RefObject<HTMLInputElement>;
    existingUrl?: string | null;
    accept?: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        {upload.preview ? (
          <div className="relative">
            {upload.file?.type.startsWith('image/') ? (
              <img
                src={upload.preview}
                alt={label}
                className="h-16 w-16 object-cover rounded-lg border"
              />
            ) : (
              <div className="h-16 w-16 flex items-center justify-center rounded-lg border bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5"
              onClick={() => clearUpload(setUpload, inputRef)}
              aria-label={`Remove ${label}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : existingUrl ? (
          <div className="flex items-center gap-2">
            <a
              href={existingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
              aria-label={`View current ${label} (opens in new tab)`}
            >
              <ExternalLink className="h-4 w-4" />
              View current
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              aria-label={`Replace ${label}`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Replace
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            aria-label={`Upload ${label}`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFileChange(e, setUpload)}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Pencil className="h-4 w-4" />
            </span>
            Edit Driver
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <ScrollArea className="h-[60vh] pr-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="identity">Identity</TabsTrigger>
                  <TabsTrigger value="certificates">Certificates</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  {/* Driver Photo */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        {photoUpload.preview ? (
                          <AvatarImage src={photoUpload.preview} alt="Driver photo" />
                        ) : driver.photo_url ? (
                          <AvatarImage src={driver.photo_url} alt={driver.name} />
                        ) : null}
                        <AvatarFallback className="text-2xl">
                          {form.watch('name')?.split(' ').map(n => n[0]).join('') || driver.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                        onClick={() => photoInputRef.current?.click()}
                        aria-label="Upload driver photo"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, setPhotoUpload)}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="driver-name">Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            id="driver-name"
                            placeholder="Enter driver's full name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="driver-contact">Contact Number</FormLabel>
                        <FormControl>
                          <Input 
                            id="driver-contact"
                            placeholder="Enter phone number" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="available"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel htmlFor="driver-available" className="text-base">Available</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Mark driver as available for assignments
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            id="driver-available"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label="Toggle driver availability"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="identity" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Passport</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="passport_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="passport-number">Passport Number</FormLabel>
                            <FormControl>
                              <Input 
                                id="passport-number"
                                placeholder="Enter passport number" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="passport_expiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="passport-expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="edit_passport_expiry_na"
                                  checked={passportExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setPassportExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  aria-label="Passport expiry not applicable"
                                />
                                <label
                                  htmlFor="edit_passport_expiry_na"
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  N/A
                                </label>
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    disabled={passportExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !passportExpiryNA && 'text-muted-foreground',
                                      passportExpiryNA && 'opacity-50'
                                    )}
                                    aria-label="Select passport expiry date"
                                  >
                                    {passportExpiryNA ? 'N/A' : (field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date')}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DocumentUploadField
                        label="Passport Document"
                        icon={FileText}
                        upload={passportDocUpload}
                        setUpload={setPassportDocUpload}
                        inputRef={passportDocInputRef}
                        existingUrl={driver.passport_doc_url}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">ID Document</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="id_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="id-number">ID Number</FormLabel>
                            <FormControl>
                              <Input 
                                id="id-number"
                                placeholder="Enter ID number" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DocumentUploadField
                        label="ID Document"
                        icon={FileText}
                        upload={idDocUpload}
                        setUpload={setIdDocUpload}
                        inputRef={idDocInputRef}
                        existingUrl={driver.id_doc_url}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="certificates" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Driver's License</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="drivers_license"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor="drivers-license">License Number</FormLabel>
                            <FormControl>
                              <Input 
                                id="drivers-license"
                                placeholder="Enter license number" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="drivers_license_expiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="drivers-license-expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="edit_drivers_license_expiry_na"
                                  checked={driversLicenseExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setDriversLicenseExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  aria-label="Driver's license expiry not applicable"
                                />
                                <label
                                  htmlFor="edit_drivers_license_expiry_na"
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  N/A
                                </label>
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    disabled={driversLicenseExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !driversLicenseExpiryNA && 'text-muted-foreground',
                                      driversLicenseExpiryNA && 'opacity-50'
                                    )}
                                    aria-label="Select driver's license expiry date"
                                  >
                                    {driversLicenseExpiryNA ? 'N/A' : (field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date')}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DocumentUploadField
                        label="License Document"
                        icon={FileText}
                        upload={licenseDocUpload}
                        setUpload={setLicenseDocUpload}
                        inputRef={licenseDocInputRef}
                        existingUrl={driver.drivers_license_doc_url}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Re-test Certificate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="retest_certificate_expiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="retest-certificate-expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="edit_retest_certificate_expiry_na"
                                  checked={retestCertificateExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setRetestCertificateExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  aria-label="Re-test certificate expiry not applicable"
                                />
                                <label
                                  htmlFor="edit_retest_certificate_expiry_na"
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  N/A
                                </label>
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    disabled={retestCertificateExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !retestCertificateExpiryNA && 'text-muted-foreground',
                                      retestCertificateExpiryNA && 'opacity-50'
                                    )}
                                    aria-label="Select re-test certificate expiry date"
                                  >
                                    {retestCertificateExpiryNA ? 'N/A' : (field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date')}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DocumentUploadField
                        label="Re-test Certificate"
                        icon={FileText}
                        upload={retestDocUpload}
                        setUpload={setRetestDocUpload}
                        inputRef={retestDocInputRef}
                        existingUrl={driver.retest_certificate_doc_url}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Medical Certificate
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="medical_certificate_expiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="medical-certificate-expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="edit_medical_certificate_expiry_na"
                                  checked={medicalCertificateExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setMedicalCertificateExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  aria-label="Medical certificate expiry not applicable"
                                />
                                <label
                                  htmlFor="edit_medical_certificate_expiry_na"
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  N/A
                                </label>
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    disabled={medicalCertificateExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !medicalCertificateExpiryNA && 'text-muted-foreground',
                                      medicalCertificateExpiryNA && 'opacity-50'
                                    )}
                                    aria-label="Select medical certificate expiry date"
                                  >
                                    {medicalCertificateExpiryNA ? 'N/A' : (field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date')}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DocumentUploadField
                        label="Medical Certificate"
                        icon={FileText}
                        upload={medicalDocUpload}
                        setUpload={setMedicalDocUpload}
                        inputRef={medicalDocInputRef}
                        existingUrl={driver.medical_certificate_doc_url}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        International Driving Permit
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="international_driving_permit_expiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="international-permit-expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="edit_international_driving_permit_expiry_na"
                                  checked={internationalPermitExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setInternationalPermitExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  aria-label="International driving permit expiry not applicable"
                                />
                                <label
                                  htmlFor="edit_international_driving_permit_expiry_na"
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  N/A
                                </label>
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    disabled={internationalPermitExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !internationalPermitExpiryNA && 'text-muted-foreground',
                                      internationalPermitExpiryNA && 'opacity-50'
                                    )}
                                    aria-label="Select international driving permit expiry date"
                                  >
                                    {internationalPermitExpiryNA ? 'N/A' : (field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date')}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DocumentUploadField
                        label="International Driving Permit"
                        icon={FileText}
                        upload={internationalPermitDocUpload}
                        setUpload={setInternationalPermitDocUpload}
                        inputRef={internationalPermitDocInputRef}
                        existingUrl={driver.international_driving_permit_doc_url}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Defensive Driving Permit
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="defensive_driving_permit_expiry"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <FormLabel htmlFor="defensive-permit-expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="edit_defensive_driving_permit_expiry_na"
                                  checked={defensivePermitExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setDefensivePermitExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  aria-label="Defensive driving permit expiry not applicable"
                                />
                                <label
                                  htmlFor="edit_defensive_driving_permit_expiry_na"
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  N/A
                                </label>
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    disabled={defensivePermitExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !defensivePermitExpiryNA && 'text-muted-foreground',
                                      defensivePermitExpiryNA && 'opacity-50'
                                    )}
                                    aria-label="Select defensive driving permit expiry date"
                                  >
                                    {defensivePermitExpiryNA ? 'N/A' : (field.value ? format(field.value, 'dd/MM/yyyy') : 'Select date')}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DocumentUploadField
                        label="Defensive Driving Permit"
                        icon={FileText}
                        upload={defensivePermitDocUpload}
                        setUpload={setDefensivePermitDocUpload}
                        inputRef={defensivePermitDocInputRef}
                        existingUrl={driver.defensive_driving_permit_doc_url}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateDriver.isPending || isUploading}>
                {updateDriver.isPending || isUploading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default EditDriverDialog;