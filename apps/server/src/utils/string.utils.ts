export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(
  text: string,
  maxLength: number,
  suffix = "..."
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function capitalizeFirstLetter(text: string): string {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function capitalizeWords(text: string): string {
  return text
    .split(" ")
    .map((word) => capitalizeFirstLetter(word))
    .join(" ");
}
