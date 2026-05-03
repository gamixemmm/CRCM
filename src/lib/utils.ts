import { format, formatDistanceToNow, differenceInDays, isAfter, isBefore, parseISO } from "date-fns";
import { BUSINESS_TIME_ZONE, getBusinessDateParts, getRentalDays as getBusinessRentalDays } from "@/lib/businessTime";

// ─── Currency ────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Dates ───────────────────────────────────────────────────────
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  const parts = getBusinessDateParts(d);
  return `${parts.year}-${String(parts.month + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function getRentalDays(start: Date | string, end: Date | string): number {
  return getBusinessRentalDays(start, end);
}

export function isExpiringSoon(date: Date | string, withinDays: number = 30): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  const now = new Date();
  const futureDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return isAfter(d, now) && isBefore(d, futureDate);
}

export function isExpired(date: Date | string): boolean {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isBefore(d, new Date());
}

// ─── String Helpers ──────────────────────────────────────────────
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function formatPlateNumber(plate: string): string {
  return plate.toUpperCase().trim();
}

// ─── Status Helpers ──────────────────────────────────────────────
export type VehicleStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE" | "OUT_OF_SERVICE";
export type BookingStatus = "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "LATE";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE: "var(--success)",
    RENTED: "var(--accent)",
    MAINTENANCE: "var(--warning)",
    OUT_OF_SERVICE: "var(--danger)",
    PENDING: "var(--warning)",
    CONFIRMED: "var(--info)",
    ACTIVE: "var(--success)",
    LATE: "var(--danger)",
    COMPLETED: "var(--text-secondary)",
    CANCELLED: "var(--danger)",
    PARTIAL: "var(--warning)",
    PAID: "var(--success)",
    REFUNDED: "var(--info)",
  };
  return map[status] || "var(--text-secondary)";
}

export function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE: "var(--success-muted)",
    RENTED: "var(--accent-muted)",
    MAINTENANCE: "var(--warning-muted)",
    OUT_OF_SERVICE: "var(--danger-muted)",
    PENDING: "var(--warning-muted)",
    CONFIRMED: "var(--info-muted)",
    ACTIVE: "var(--success-muted)",
    LATE: "var(--danger-muted)",
    COMPLETED: "rgba(136, 136, 160, 0.1)",
    CANCELLED: "var(--danger-muted)",
    PARTIAL: "var(--warning-muted)",
    PAID: "var(--success-muted)",
    REFUNDED: "var(--info-muted)",
  };
  return map[status] || "rgba(136, 136, 160, 0.1)";
}

export function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getBookingDisplayStatus(booking: { status: string; endDate: Date | string }): string {
  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    return booking.status;
  }

  const end = typeof booking.endDate === "string" ? parseISO(booking.endDate) : booking.endDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const returnDay = new Date(end);
  returnDay.setHours(0, 0, 0, 0);

  return returnDay < today ? "LATE" : booking.status;
}

// ─── Numbers ─────────────────────────────────────────────────────
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatMileage(km: number): string {
  return `${formatNumber(km)} km`;
}

// ─── Misc ────────────────────────────────────────────────────────
export function cn(...classes: (string | boolean | undefined | null | number | Record<string, any> | any)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
