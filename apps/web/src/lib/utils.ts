import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirstName(name?: string) {
  return name ? name.split(" ")[0] : "";
}

export function getAbbreviatedName(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join(".");
}

export function shortenName(name: string) {
  const names = name.split(" ");
  if (names.length > 1) {
    const lastName = names.at(-1);
    return lastName ? `${names[0]} ${lastName[0]}` : name;
  }
  return name;
}

const WHITESPACE_REGEX = /\s+/;

export function getInitials(name: string) {
  const parts = name.trim().split(WHITESPACE_REGEX);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const lastPart = parts.at(-1);
  return (parts[0][0] + (lastPart ? lastPart[0] : "")).toUpperCase();
}
