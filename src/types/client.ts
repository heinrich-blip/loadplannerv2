// src/types/client.ts

export interface Client {
  id: string;
  name: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}