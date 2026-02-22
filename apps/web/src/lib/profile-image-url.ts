const PROFILE_IMAGES_PUBLIC_BASE_URL =
  import.meta.env.VITE_PROFILE_IMAGES_PUBLIC_BASE_URL?.trim() ?? "";

const ABSOLUTE_HTTP_URL_REGEX = /^https?:\/\//i;
const LEADING_SLASHES_REGEX = /^\/+/;

const isAbsoluteHttpUrl = (value: string) =>
  ABSOLUTE_HTTP_URL_REGEX.test(value);

export const getProfileImageUrl = (
  imageKeyOrUrl: string | null | undefined
): string | null => {
  const normalizedValue = imageKeyOrUrl?.trim() ?? "";
  if (normalizedValue.length === 0) {
    return null;
  }

  if (isAbsoluteHttpUrl(normalizedValue)) {
    return normalizedValue;
  }

  if (PROFILE_IMAGES_PUBLIC_BASE_URL.length === 0) {
    return null;
  }

  const normalizedBase = PROFILE_IMAGES_PUBLIC_BASE_URL.endsWith("/")
    ? PROFILE_IMAGES_PUBLIC_BASE_URL.slice(0, -1)
    : PROFILE_IMAGES_PUBLIC_BASE_URL;
  const normalizedKey = normalizedValue.replace(LEADING_SLASHES_REGEX, "");

  return `${normalizedBase}/${normalizedKey}`;
};
