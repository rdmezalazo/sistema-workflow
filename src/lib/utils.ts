import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a date string (YYYY-MM-DD or ISO) as a LOCAL date, avoiding UTC timezone shifts.
 * Critical for date-only fields stored in the database (fecha_vencimiento, fecha_pago, etc.)
 * where `new Date("2026-01-15")` would be interpreted as UTC midnight, shifting to the
 * previous day in negative timezones (e.g., Peru UTC-5).
 */
export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(NaN);
  const datePart = dateStr.split("T")[0];
  const parts = datePart.split("-");
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(dateStr);
  return new Date(year, month - 1, day);
}
