const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const SIGNED_UPLOAD_EXPIRES_IN_SECONDS = 300;

type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const fileExtensionByMimeType: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const textEncoder = new TextEncoder();

const sanitizeKeyPart = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "-");

const encodeRfc3986 = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

const toHex = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const toIsoWithoutSeparators = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");

  return {
    dateStamp: `${year}${month}${day}`,
    amzDate: `${year}${month}${day}T${hour}${minute}${second}Z`,
    year,
    month,
  };
};

const encodeObjectKey = (key: string) =>
  key
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/");

const sortQueryEntries = (entries: [string, string][]) =>
  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey === rightKey) {
      return leftValue.localeCompare(rightValue);
    }

    return leftKey.localeCompare(rightKey);
  });

const buildCanonicalQuery = (entries: [string, string][]) =>
  sortQueryEntries(entries)
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");

function sha256(content: string) {
  return crypto.subtle.digest("SHA-256", textEncoder.encode(content));
}

async function hmacSha256(key: string | ArrayBuffer, content: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? textEncoder.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(content));
}

async function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string
) {
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

export function validateProfileImageFile(params: {
  contentType: string;
  fileSizeBytes: number;
  maxSizeBytes: number;
}) {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      params.contentType as AllowedImageMimeType
    )
  ) {
    return "Only JPEG, PNG and WebP images are allowed";
  }

  if (params.fileSizeBytes > params.maxSizeBytes) {
    return `Image size must be ${Math.floor(params.maxSizeBytes / (1024 * 1024))}MB or less`;
  }

  return null;
}

export function createProfileImageObjectKey(
  userId: string,
  contentType: string
) {
  const { year, month } = toIsoWithoutSeparators(new Date());
  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID().replace(/-/g, "");
  const extension =
    fileExtensionByMimeType[contentType as AllowedImageMimeType] ?? "bin";

  return `profiles/${year}/${month}/${sanitizeKeyPart(userId)}/${timestamp}-${randomSuffix}.${extension}`;
}

export function buildProfileImagePublicUrl(baseUrl: string, key: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/${key}`;
}

export async function createProfileImagePresignedPutUrl(params: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const host = `${params.accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";
  const expiresInSeconds =
    params.expiresInSeconds ?? SIGNED_UPLOAD_EXPIRES_IN_SECONDS;
  const { dateStamp, amzDate } = toIsoWithoutSeparators(new Date());
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const signedHeaders = "content-type;host";
  const encodedKey = encodeObjectKey(params.objectKey);
  const canonicalUri = `/${params.bucketName}/${encodedKey}`;
  const credential = `${params.accessKeyId}/${credentialScope}`;

  const queryEntries: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", credential],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expiresInSeconds)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ];

  const canonicalQuery = buildCanonicalQuery(queryEntries);
  const canonicalHeaders = `content-type:${params.contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const hashedCanonicalRequest = toHex(await sha256(canonicalRequest));
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashedCanonicalRequest,
  ].join("\n");

  const signingKey = await deriveSigningKey(
    params.secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  const uploadUrl = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;

  return {
    uploadUrl,
    expiresInSeconds,
  };
}
