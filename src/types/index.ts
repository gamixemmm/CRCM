// ─── Vehicle Types ───────────────────────────────────────────────
export type VehicleStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE" | "OUT_OF_SERVICE";

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  transmission: string;
  fuelType: string;
  dailyRate: number;
  mileage: number;
  status: VehicleStatus;
  imageUrl: string | null;
  insuranceExpiry: Date | null;
  registrationExpiry: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  bookings?: Booking[];
  maintenance?: Maintenance[];
}

// ─── Customer Types ──────────────────────────────────────────────
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  licenseNumber: string;
  licenseExpiry: Date | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  bookings?: Booking[];
}

// ─── Booking Types ───────────────────────────────────────────────
export type BookingStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  pickupLocation: string | null;
  returnLocation: string | null;
  status: BookingStatus;
  totalAmount: number;
  depositAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer;
  vehicle?: Vehicle;
  invoice?: Invoice | null;
}

// ─── Invoice Types ───────────────────────────────────────────────
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";

export interface Invoice {
  id: string;
  bookingId: string;
  subtotal: number;
  extraCharges: number;
  extraChargeDesc: string | null;
  discount: number;
  totalAmount: number;
  depositPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  booking?: Booking;
}

// ─── Maintenance Types ───────────────────────────────────────────
export interface Maintenance {
  id: string;
  vehicleId: string;
  serviceDate: Date;
  returnDate: Date | null;
  description: string;
  cost: number;
  serviceProvider: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  vehicle?: Vehicle;
}

// ─── Action Response Types ───────────────────────────────────────
export interface ActionResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// ─── Nav Types ───────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}
