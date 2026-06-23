import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import multer from "multer";
import { env, isCloudinaryConfigured } from "../config/env.js";

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret
});

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export async function uploadBuffer(file: Express.Multer.File, folder: string) {
  if (!isCloudinaryConfigured) {
    return {
      url: `local://${file.originalname}`,
      publicId: "",
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  const result = await new Promise<UploadApiResponse>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "auto", filename_override: file.originalname },
        (error, response) => {
          if (error || !response) reject(error);
          else resolve(response);
        }
      );
      stream.end(file.buffer);
    }
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}
