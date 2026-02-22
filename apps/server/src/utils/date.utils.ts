import {
  addDays as addDaysToDate,
  addMinutes,
  compareDesc,
  differenceInYears,
  format,
  formatISO,
  getTime,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  toDate,
} from "date-fns";

type DateInput = Date | number | string;

const INVALID_DATE_ERROR = "Invalid date format";

function resolveDateInput(date: DateInput): Date {
  if (typeof date === "string") {
    const isoDate = parseISO(date);
    if (isValid(isoDate)) {
      return isoDate;
    }

    return toDate(date);
  }

  return toDate(date);
}

function requireValidDate(date: Date): Date {
  if (!isValid(date)) {
    throw new Error(INVALID_DATE_ERROR);
  }

  return date;
}

export function getCurrentDate(): Date {
  return new Date();
}

export function getCurrentIsoTimestamp(): string {
  return formatISO(getCurrentDate());
}

export function getCurrentEpochMs(): number {
  return getTime(getCurrentDate());
}

export function formatDate(date: DateInput): string {
  return formatISO(requireValidDate(resolveDateInput(date)));
}

export function parseDate(dateString: string): Date {
  return requireValidDate(resolveDateInput(dateString));
}

export function addDays(date: Date, days: number): Date {
  return addDaysToDate(date, days);
}

export function addMinutesToDate(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

export function createFutureDateByMinutes(minutes: number): Date {
  return addMinutesToDate(getCurrentDate(), minutes);
}

export function isDateInPast(date: DateInput): boolean {
  return isBefore(requireValidDate(resolveDateInput(date)), getCurrentDate());
}

export function isDateInFuture(date: DateInput): boolean {
  return isAfter(requireValidDate(resolveDateInput(date)), getCurrentDate());
}

export function isDateExpired(date: Date): boolean {
  return isBefore(date, getCurrentDate());
}

export function formatDateForDisplay(date: DateInput): string {
  return format(requireValidDate(resolveDateInput(date)), "MMMM d, yyyy");
}

export function formatTimeForDisplay(date: DateInput): string {
  return format(requireValidDate(resolveDateInput(date)), "hh:mm a");
}

export function calculateAgeFromDob(dob: Date): number {
  return Math.max(differenceInYears(getCurrentDate(), dob), 0);
}

export function compareDatesDesc(first: Date, second: Date): number {
  return compareDesc(first, second);
}

export function getAwsUtcDateParts(date: Date) {
  const utcDate = addMinutes(date, date.getTimezoneOffset());
  const dateStamp = format(utcDate, "yyyyMMdd");
  const amzDate = `${dateStamp}T${format(utcDate, "HHmmss")}Z`;

  return {
    dateStamp,
    amzDate,
    year: format(utcDate, "yyyy"),
    month: format(utcDate, "MM"),
  };
}
