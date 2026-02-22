import {
  differenceInYears,
  format,
  fromUnixTime,
  isAfter,
  isFuture,
  isValid,
  isWithinInterval,
  parseISO,
  subYears,
} from "date-fns";

const DATE_FROM_SECONDS_THRESHOLD = 1_000_000_000_000;
const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type DateLike = Date | number | string;

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateInput(value: string): Date | null {
  const trimmedValue = value.trim();
  if (!DATE_INPUT_REGEX.test(trimmedValue)) {
    return null;
  }

  const parsedDate = parseISO(trimmedValue);
  return isValid(parsedDate) ? parsedDate : null;
}

export function getDefaultAdultDob(referenceDate: Date = new Date()): Date {
  return subYears(referenceDate, 18);
}

export function calculateAgeFromDob(
  dob: Date,
  referenceDate: Date = new Date()
): number {
  return Math.max(differenceInYears(referenceDate, dob), 0);
}

export function isNotFutureDate(date: Date): boolean {
  return !isFuture(date);
}

function resolveNumericDate(value: number): Date {
  const parsedDate =
    value < DATE_FROM_SECONDS_THRESHOLD
      ? fromUnixTime(value)
      : fromUnixTime(value / 1000);

  return parsedDate;
}

function resolveStringDate(value: string): Date | null {
  const parsedDateInput = parseDateInput(value);
  if (parsedDateInput) {
    return parsedDateInput;
  }

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    const parsedNumericDate = resolveNumericDate(numericValue);
    return isValid(parsedNumericDate) ? parsedNumericDate : null;
  }

  const parsedIsoDate = parseISO(value);
  return isValid(parsedIsoDate) ? parsedIsoDate : null;
}

export function resolveDateLike(
  value: DateLike,
  fallback: Date = getDefaultAdultDob()
): Date {
  if (value instanceof Date) {
    return isValid(value) ? value : fallback;
  }

  if (typeof value === "number") {
    const parsedDate = resolveNumericDate(value);
    return isValid(parsedDate) ? parsedDate : fallback;
  }

  const parsedDate = resolveStringDate(value);
  return parsedDate ?? fallback;
}

export function isDateWithinInclusiveRange(
  date: Date,
  start: Date,
  end: Date
): boolean {
  return isWithinInterval(date, { start, end });
}

export function formatMonthDay(date: Date): string {
  return format(date, "MMM d");
}

export function formatWeekdayMonthDayYear(date: Date): string {
  return format(date, "EEE, MMM d, yyyy");
}

export function formatShortMonth(date: Date): string {
  return format(date, "MMM");
}

export function isDateOnOrBefore(date: Date, compareDate: Date): boolean {
  return !isAfter(date, compareDate);
}
