import { getProfileImageUrl } from "@/lib/profile-image-url";
import { client } from "@/utils/orpc";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

export interface UploadProfileImageResult {
  key: string;
  url: string;
}

interface PresignUploadResponse {
  expiresInSeconds: number;
  headers: {
    "Content-Type": string;
  };
  key: string;
  method: "PUT";
  uploadUrl: string;
}

const BASE64_CHUNK_SIZE = 0x80_00;

const fileToBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + BASE64_CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const attemptDirectUpload = async (
  file: File
): Promise<UploadProfileImageResult | null> => {
  try {
    const presignResponse = await fetch(
      "/api/v1/uploads/profile-image/presign",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType: file.type,
          fileSizeBytes: file.size,
        }),
      }
    );

    const presignPayload = (await presignResponse.json()) as {
      success?: boolean;
      error?: string;
      data?: PresignUploadResponse;
    };

    if (
      !(
        presignResponse.ok &&
        presignPayload.success &&
        presignPayload.data &&
        presignPayload.data.method === "PUT"
      )
    ) {
      return null;
    }

    const uploadResponse = await fetch(presignPayload.data.uploadUrl, {
      method: "PUT",
      headers: presignPayload.data.headers,
      body: file,
    });

    if (!uploadResponse.ok) {
      return null;
    }

    return {
      key: presignPayload.data.key,
      url: getProfileImageUrl(presignPayload.data.key) ?? "",
    };
  } catch (_error) {
    return null;
  }
};

const isAllowedImageType = (mimeType: string) =>
  ALLOWED_IMAGE_TYPES.includes(
    mimeType as (typeof ALLOWED_IMAGE_TYPES)[number]
  );

export const validateProfileImageFile = (file: File) => {
  if (!isAllowedImageType(file.type)) {
    throw new Error("Only JPEG, PNG and WebP images are allowed");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Image size must be 5MB or less");
  }
};

export const uploadProfileImage = async (
  file: File
): Promise<UploadProfileImageResult> => {
  validateProfileImageFile(file);

  const directUploadResult = await attemptDirectUpload(file);
  if (directUploadResult) {
    return directUploadResult;
  }

  const fallbackPayload = await client.uploadProfileImageFallback({
    contentType: file.type,
    fileSizeBytes: file.size,
    fileBase64: await fileToBase64(file),
  });

  return {
    key: fallbackPayload.key,
    url: getProfileImageUrl(fallbackPayload.key) ?? fallbackPayload.url ?? "",
  };
};
