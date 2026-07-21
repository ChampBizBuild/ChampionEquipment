import type { HireDetails } from "./hireAgreement";

export type BookingStatus =
  | "enquiry"
  | "terms_sent"
  | "confirmed"
  | "out"
  | "returned"
  | "invoiced"
  | "paid"
  | "cancelled";

export type EquipmentStatus =
  | "available"
  | "booked"
  | "out"
  | "returned"
  | "service";

export type DocumentType =
  | "terms_of_trade"
  | "hire_agreement"
  | "acceptance_snapshot";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

/** Hire = charged before schedule; additional = extras on return. */
export type InvoiceKind = "hire" | "additional";

export type Client = {
  id: string;
  business_name: string;
  contact_name: string;
  abn: string | null;
  email: string;
  phone: string | null;
  billing_address: string | null;
  notes: string | null;
  created_at: string;
};

export type Equipment = {
  id: string;
  name: string;
  make_model: string | null;
  asset_id: string | null;
  day_rate: number;
  week_rate: number;
  status: EquipmentStatus;
  notes: string | null;
  created_at: string;
};

export type FuelLevel = "empty" | "1/4" | "1/2" | "3/4" | "full";

export type InspectionPhase = "outbound" | "return";

export type ConditionInspection = {
  id: string;
  booking_id: string;
  equipment_id: string;
  phase: InspectionPhase;
  hours_reading: number | null;
  fuel_level: FuelLevel;
  photo_front_url: string | null;
  photo_rear_url: string | null;
  photo_left_url: string | null;
  photo_right_url: string | null;
  notes: string | null;
  needs_service: boolean;
  inspected_at: string;
  inspected_by: string | null;
  client_ack_token: string;
  client_ack_name: string | null;
  client_ack_at: string | null;
  client_ack_ip: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  client_id: string;
  equipment_id: string;
  pickup_date: string;
  dropoff_date: string;
  status: BookingStatus;
  accept_token: string;
  needs_service: boolean;
  notes: string | null;
  hire_details: HireDetails | Record<string, unknown>;
  payment_received_at: string | null;
  payment_notes: string | null;
  scheduled_at: string | null;
  created_at: string;
};

export type Document = {
  id: string;
  booking_id: string;
  type: DocumentType;
  sent_at: string | null;
  accepted_at: string | null;
  accepted_name: string | null;
  accepted_ip: string | null;
  pdf_url: string | null;
  created_at: string;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_amount: number;
  amount: number;
};

export type Invoice = {
  id: string;
  booking_id: string;
  kind: InvoiceKind;
  invoice_number: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  gst: number;
  total: number;
  due_date: string | null;
  status: InvoiceStatus;
  pdf_url: string | null;
  created_at: string;
};

export type DocumentTemplate = {
  id: string;
  type: "terms_of_trade" | "hire_agreement";
  title: string;
  body: string;
  updated_at: string;
};

export type BusinessSettings = {
  id: string;
  business_name: string;
  trading_as: string;
  abn: string;
  email: string;
  phone: string;
  address: string;
  bank_name: string;
  bsb: string;
  account_number: string;
  account_name: string;
  gst_registered: boolean;
  invoice_prefix: string;
  next_invoice_number: number;
  updated_at: string;
};

export type BookingWithRelations = Booking & {
  clients: Client;
  equipment: Equipment;
};
