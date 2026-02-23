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
import { uploadDriverDocument } from '@/hooks/useDriverDocuments';
import type { DocumentType } from '@/hooks/useDriverDocuments';
import { useCreateDriver } from '@/hooks/useDrivers';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Camera, FileText, Upload, User, X } from 'lucide-react';
import { useRef, useState } from 'react';
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

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDriverDialog({ open, onOpenChange }: CreateDriverDialogProps) {
  const createDriver = useCreateDriver();
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

  const resetAllUploads = () => {
    setPhotoUpload({ file: null, preview: null });
    setPassportDocUpload({ file: null, preview: null });
    setIdDocUpload({ file: null, preview: null });
    setLicenseDocUpload({ file: null, preview: null });
    setRetestDocUpload({ file: null, preview: null });
    setMedicalDocUpload({ file: null, preview: null });
    setInternationalPermitDocUpload({ file: null, preview: null });
    setDefensivePermitDocUpload({ file: null, preview: null });
    // Reset N/A states
    setPassportExpiryNA(false);
    setDriversLicenseExpiryNA(false);
    setRetestCertificateExpiryNA(false);
    setMedicalCertificateExpiryNA(false);
    setInternationalPermitExpiryNA(false);
    setDefensivePermitExpiryNA(false);
  };

  const handleSubmit = async (data: FormData) => {
    setIsUploading(true);
    
    try {
      // Create the driver first to get the ID
      // Use sentinel date 9999-12-31 for N/A (not applicable)
      const NA_DATE = '9999-12-31';
      const driverData = {
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
        photo_url: null as string | null,
        passport_doc_url: null as string | null,
        id_doc_url: null as string | null,
        drivers_license_doc_url: null as string | null,
        retest_certificate_doc_url: null as string | null,
        medical_certificate_doc_url: null as string | null,
        international_driving_permit_doc_url: null as string | null,
        defensive_driving_permit_doc_url: null as string | null,
      };

      // We'll create driver first, then upload documents and update
      createDriver.mutate(driverData, {
        onSuccess: async (newDriver) => {
          // Now upload documents with the new driver ID
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
              const result = await uploadDriverDocument(newDriver.id, u.type, u.file!);
              return { field: u.field, url: result?.url || null };
            });

          const uploadResults = await Promise.all(uploadPromises);

          // Update driver with document URLs if any were uploaded
          if (uploadResults.length > 0) {
            const updates: Record<string, string | null> = {};
            uploadResults.forEach((r) => {
              if (r.url) {
                updates[r.field] = r.url;
              }
            });

            if (Object.keys(updates).length > 0) {
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.from('drivers').update(updates).eq('id', newDriver.id);
            }
          }

          form.reset();
          resetAllUploads();
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
    accept = 'image/*,.pdf',
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    upload: DocumentUpload;
    setUpload: React.Dispatch<React.SetStateAction<DocumentUpload>>;
    inputRef: React.RefObject<HTMLInputElement>;
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
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
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
          aria-label={`Upload ${label}`}
          onChange={(e) => handleFileChange(e, setUpload)}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <User className="h-4 w-4" />
            </span>
            Add New Driver
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
                        ) : null}
                        <AvatarFallback className="text-2xl">
                          {form.watch('name')?.split(' ').map(n => n[0]).join('') || <User className="h-8 w-8" />}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        aria-label="Upload driver photo"
                        onChange={(e) => handleFileChange(e, setPhotoUpload)}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="name">Full Name</FormLabel>
                        <FormControl>
                          <Input id="name" placeholder="Enter driver's full name" {...field} />
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
                        <FormLabel htmlFor="contact">Contact Number</FormLabel>
                        <FormControl>
                          <Input id="contact" placeholder="Enter phone number" {...field} />
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
                          <FormLabel htmlFor="available" className="text-base">Available</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Mark driver as available for assignments
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            id="available"
                            checked={field.value}
                            onCheckedChange={field.onChange}
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
                            <FormLabel htmlFor="passport_number">Passport Number</FormLabel>
                            <FormControl>
                              <Input id="passport_number" placeholder="Enter passport number" {...field} />
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
                              <FormLabel htmlFor="passport_expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="passport_expiry_na"
                                  checked={passportExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setPassportExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="passport_expiry_na"
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
                                    id="passport_expiry"
                                    variant="outline"
                                    disabled={passportExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !passportExpiryNA && 'text-muted-foreground',
                                      passportExpiryNA && 'opacity-50'
                                    )}
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
                            <FormLabel htmlFor="id_number">ID Number</FormLabel>
                            <FormControl>
                              <Input id="id_number" placeholder="Enter ID number" {...field} />
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
                            <FormLabel htmlFor="drivers_license">License Number</FormLabel>
                            <FormControl>
                              <Input id="drivers_license" placeholder="Enter license number" {...field} />
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
                              <FormLabel htmlFor="drivers_license_expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="drivers_license_expiry_na"
                                  checked={driversLicenseExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setDriversLicenseExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="drivers_license_expiry_na"
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
                                    id="drivers_license_expiry"
                                    variant="outline"
                                    disabled={driversLicenseExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !driversLicenseExpiryNA && 'text-muted-foreground',
                                      driversLicenseExpiryNA && 'opacity-50'
                                    )}
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
                              <FormLabel htmlFor="retest_certificate_expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="retest_certificate_expiry_na"
                                  checked={retestCertificateExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setRetestCertificateExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="retest_certificate_expiry_na"
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
                                    id="retest_certificate_expiry"
                                    variant="outline"
                                    disabled={retestCertificateExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !retestCertificateExpiryNA && 'text-muted-foreground',
                                      retestCertificateExpiryNA && 'opacity-50'
                                    )}
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
                              <FormLabel htmlFor="medical_certificate_expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="medical_certificate_expiry_na"
                                  checked={medicalCertificateExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setMedicalCertificateExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="medical_certificate_expiry_na"
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
                                    id="medical_certificate_expiry"
                                    variant="outline"
                                    disabled={medicalCertificateExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !medicalCertificateExpiryNA && 'text-muted-foreground',
                                      medicalCertificateExpiryNA && 'opacity-50'
                                    )}
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
                              <FormLabel htmlFor="international_driving_permit_expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="international_driving_permit_expiry_na"
                                  checked={internationalPermitExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setInternationalPermitExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="international_driving_permit_expiry_na"
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
                                    id="international_driving_permit_expiry"
                                    variant="outline"
                                    disabled={internationalPermitExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !internationalPermitExpiryNA && 'text-muted-foreground',
                                      internationalPermitExpiryNA && 'opacity-50'
                                    )}
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
                              <FormLabel htmlFor="defensive_driving_permit_expiry">Expiry Date</FormLabel>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="defensive_driving_permit_expiry_na"
                                  checked={defensivePermitExpiryNA}
                                  onCheckedChange={(checked) => {
                                    setDefensivePermitExpiryNA(checked === true);
                                    if (checked) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor="defensive_driving_permit_expiry_na"
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
                                    id="defensive_driving_permit_expiry"
                                    variant="outline"
                                    disabled={defensivePermitExpiryNA}
                                    className={cn(
                                      'pl-3 text-left font-normal',
                                      !field.value && !defensivePermitExpiryNA && 'text-muted-foreground',
                                      defensivePermitExpiryNA && 'opacity-50'
                                    )}
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
              <Button type="submit" disabled={createDriver.isPending || isUploading}>
                {createDriver.isPending || isUploading ? 'Adding...' : 'Add Driver'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDriverDialog;