import { parseLocalDate } from "@/lib/utils";

export type PaymentCycle = "unico" | "mensual" | "anual";

export function parseStoredLocalDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? undefined
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const parsed = parseLocalDate(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatLocalYMD(value: string | Date | null | undefined): string | null {
  const date = parseStoredLocalDate(value);
  if (!date) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function normalizePaymentDay(value: number | null | undefined): number {
  const parsed = Math.trunc(Number(value ?? 15));
  if (Number.isNaN(parsed)) return 15;
  return Math.min(Math.max(parsed, 1), 28);
}

function shiftLocalMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function getInstallmentDate({
  startDate,
  paymentDay,
  cycle,
  installmentIndex,
}: {
  startDate: string | Date;
  paymentDay: number | null | undefined;
  cycle: Extract<PaymentCycle, "mensual" | "anual">;
  installmentIndex: number;
}): Date {
  const parsedStart = parseStoredLocalDate(startDate);
  if (!parsedStart) return new Date(NaN);

  const normalizedDay = normalizePaymentDay(paymentDay);
  const firstCandidate = new Date(parsedStart.getFullYear(), parsedStart.getMonth(), normalizedDay);
  const firstInstallment = firstCandidate < parsedStart
    ? shiftLocalMonths(firstCandidate, cycle === "anual" ? 12 : 1)
    : firstCandidate;

  const monthStep = cycle === "anual" ? installmentIndex * 12 : installmentIndex;
  return shiftLocalMonths(firstInstallment, monthStep);
}

export function buildContractPaymentDrafts(contract: {
  datos_plantilla?: unknown;
  dia_vencimiento?: number | null;
  fecha_inicio: string;
  monto_total?: number | null;
  numero_cuotas?: number | null;
}, contractId: string) {
  const maybeTemplate = contract.datos_plantilla && typeof contract.datos_plantilla === "object"
    ? (contract.datos_plantilla as { payment_schedule?: Array<{ fecha?: string | Date | null; monto?: number | null }> | null })
    : null;

  const schedule = Array.isArray(maybeTemplate?.payment_schedule)
    ? maybeTemplate.payment_schedule
    : [];

  const storedPayments = schedule
    .map((item) => ({
      contrato_id: contractId,
      monto: Number(item.monto) || 0,
      fecha_vencimiento: formatLocalYMD(item.fecha),
      status: "pendiente" as const,
    }))
    .filter((item) => item.fecha_vencimiento);

  if (storedPayments.length > 0) {
    return storedPayments.sort((a, b) => a.fecha_vencimiento!.localeCompare(b.fecha_vencimiento!));
  }

  const numeroCuotas = Math.max(1, Number(contract.numero_cuotas) || 1);
  const montoTotal = Number(contract.monto_total) || 0;
  const montoCuota = montoTotal / numeroCuotas;

  return Array.from({ length: numeroCuotas }, (_, index) => ({
    contrato_id: contractId,
    monto: montoCuota,
    fecha_vencimiento: formatLocalYMD(
      getInstallmentDate({
        startDate: contract.fecha_inicio,
        paymentDay: contract.dia_vencimiento,
        cycle: "mensual",
        installmentIndex: index,
      }),
    ),
    status: "pendiente" as const,
  })).filter((item) => item.fecha_vencimiento);
}