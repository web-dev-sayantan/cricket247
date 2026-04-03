import { env } from "@/config/env";
import {
  buildProfileImagePublicUrl,
  createProfileImageObjectKey,
  createProfileImagePresignedPutUrl,
  validateProfileImageFile,
} from "@/services/profile-image.service";

interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
  };
}

export interface ProfileImagesBucket {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: R2PutOptions
  ) => Promise<object>;
}

export class ProfileImageUploadError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProfileImageUploadError";
    this.status = status;
  }
}

const resolvePresignConfiguration = (): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
} => {
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucketName = env.PROFILE_IMAGES_BUCKET_NAME;

  if (!(bucketName && accountId && accessKeyId && secretAccessKey)) {
    throw new ProfileImageUploadError(
      "Profile image upload is not configured for server fallback",
      500
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
};

export const uploadProfileImageForUser = async (params: {
  bucket?: ProfileImagesBucket;
  contentType: string;
  fileSizeBytes: number;
  userId: string;
  body: ArrayBuffer;
}) => {
  if (!env.PROFILE_IMAGES_PUBLIC_BASE_URL) {
    throw new ProfileImageUploadError(
      "Profile image upload is not configured",
      500
    );
  }

  const validationError = validateProfileImageFile({
    contentType: params.contentType,
    fileSizeBytes: params.fileSizeBytes,
    maxSizeBytes: env.PROFILE_IMAGE_MAX_SIZE_BYTES,
  });

  if (validationError) {
    throw new ProfileImageUploadError(validationError, 400);
  }

  const key = createProfileImageObjectKey(params.userId, params.contentType);

  if (params.bucket) {
    await params.bucket.put(key, params.body, {
      httpMetadata: {
        contentType: params.contentType,
      },
    });
  } else {
    const storageConfig = resolvePresignConfiguration();

    const { uploadUrl } = await createProfileImagePresignedPutUrl({
      accountId: storageConfig.accountId,
      accessKeyId: storageConfig.accessKeyId,
      secretAccessKey: storageConfig.secretAccessKey,
      bucketName: storageConfig.bucketName,
      objectKey: key,
      contentType: params.contentType,
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": params.contentType,
      },
      body: params.body,
    });

    if (!uploadResponse.ok) {
      throw new ProfileImageUploadError(
        "Failed to upload image to object storage",
        500
      );
    }
  }

  return {
    key,
    url: buildProfileImagePublicUrl(env.PROFILE_IMAGES_PUBLIC_BASE_URL, key),
  };
};
