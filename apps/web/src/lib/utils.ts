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
