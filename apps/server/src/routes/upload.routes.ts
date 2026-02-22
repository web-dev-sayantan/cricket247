import { Hono } from "hono";
import { z } from "zod";
import { env } from "@/config/env";
import { auth } from "@/lib/auth";
import { errorResponse, requireAuth, successResponse } from "@/middleware";
import {
  buildProfileImagePublicUrl,
  createProfileImageObjectKey,
  createProfileImagePresignedPutUrl,
  validateProfileImageFile,
} from "@/services/profile-image.service";

const createPresignUploadSchema = z.object({
  contentType: z.string().trim().min(1),
  fileSizeBytes: z.number().int().positive(),
});

interface R2PutOptions {
  httpMetadata?: {
    contentType?: string;
  };
}

interface ProfileImagesBucket {
  put: (
    key: string,
    value: ArrayBuffer,
    options?: R2PutOptions
  ) => Promise<object>;
}

interface UploadRouteBindings {
  PROFILE_IMAGES?: ProfileImagesBucket;
}

const uploadRoutes = new Hono<{ Bindings: UploadRouteBindings }>();

uploadRoutes.post("/profile-image/presign", requireAuth, async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user?.id) {
    return errorResponse(c, "Unauthorized", 401);
  }

  if (!env.PROFILE_IMAGES_PUBLIC_BASE_URL) {
    return errorResponse(c, "Profile image upload is not configured", 500);
  }

  if (
    !(
      env.PROFILE_IMAGES_BUCKET_NAME &&
      env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY
    )
  ) {
    return errorResponse(c, "Presigned upload is not configured", 500);
  }

  let payload: object;
  try {
    payload = await c.req.json();
  } catch (_error) {
    return errorResponse(c, "Invalid JSON payload", 400);
  }

  const parsedPayload = createPresignUploadSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return errorResponse(
      c,
      parsedPayload.error.issues[0]?.message ?? "Invalid upload payload",
      400
    );
  }

  const validationError = validateProfileImageFile({
    contentType: parsedPayload.data.contentType,
    fileSizeBytes: parsedPayload.data.fileSizeBytes,
    maxSizeBytes: env.PROFILE_IMAGE_MAX_SIZE_BYTES,
  });

  if (validationError) {
    return errorResponse(c, validationError, 400);
  }

  const key = createProfileImageObjectKey(
    session.user.id,
    parsedPayload.data.contentType
  );
  const { uploadUrl, expiresInSeconds } =
    await createProfileImagePresignedPutUrl({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucketName: env.PROFILE_IMAGES_BUCKET_NAME,
      objectKey: key,
      contentType: parsedPayload.data.contentType,
    });

  return successResponse(c, {
    key,
    url: buildProfileImagePublicUrl(env.PROFILE_IMAGES_PUBLIC_BASE_URL, key),
    uploadUrl,
    method: "PUT",
    headers: {
      "Content-Type": parsedPayload.data.contentType,
    },
    expiresInSeconds,
  });
});

uploadRoutes.post("/profile-image", requireAuth, async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user?.id) {
    return errorResponse(c, "Unauthorized", 401);
  }

  if (!env.PROFILE_IMAGES_PUBLIC_BASE_URL) {
    return errorResponse(c, "Profile image upload is not configured", 500);
  }

  const formData = await c.req.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return errorResponse(c, "Image file is required", 400);
  }

  const validationError = validateProfileImageFile({
    contentType: image.type,
    fileSizeBytes: image.size,
    maxSizeBytes: env.PROFILE_IMAGE_MAX_SIZE_BYTES,
  });

  if (validationError) {
    return errorResponse(c, validationError, 400);
  }

  const key = createProfileImageObjectKey(session.user.id, image.type);
  const body = await image.arrayBuffer();

  const bucket = c.env.PROFILE_IMAGES;
  if (bucket) {
    await bucket.put(key, body, {
      httpMetadata: {
        contentType: image.type,
      },
    });
  } else {
    if (
      !(
        env.PROFILE_IMAGES_BUCKET_NAME &&
        env.R2_ACCOUNT_ID &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY
      )
    ) {
      return errorResponse(
        c,
        "Profile image upload is not configured for local fallback",
        500
      );
    }

    const { uploadUrl } = await createProfileImagePresignedPutUrl({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucketName: env.PROFILE_IMAGES_BUCKET_NAME,
      objectKey: key,
      contentType: image.type,
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": image.type,
      },
      body,
    });

    if (!uploadResponse.ok) {
      return errorResponse(c, "Failed to upload image to object storage", 500);
    }
  }

  return successResponse(
    c,
    {
      key,
      url: buildProfileImagePublicUrl(env.PROFILE_IMAGES_PUBLIC_BASE_URL, key),
    },
    "Profile image uploaded",
    201
  );
});

export default uploadRoutes;
