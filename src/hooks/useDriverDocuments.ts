import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'driver-documents';

export type DocumentType = 
  | 'photo'
  | 'passport'
  | 'id'
  | 'drivers_license'
  | 'retest_certificate'
  | 'medical_certificate'
  | 'international_driving_permit'
  | 'defensive_driving_permit';

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadDriverDocument(
  driverId: string,
  documentType: DocumentType,
  file: File
): Promise<UploadResult | null> {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${driverId}/${documentType}_${Date.now()}.${fileExt}`;

    // Upload the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    toast({
      title: 'Upload failed',
      description: 'An unexpected error occurred',
      variant: 'destructive',
    });
    return null;
  }
}

export async function deleteDriverDocument(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}