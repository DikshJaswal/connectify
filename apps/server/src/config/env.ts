import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/connectify",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? ""
  },
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
};

export const isCloudinaryConfigured =
  Boolean(env.cloudinary.cloudName) && Boolean(env.cloudinary.apiKey) && Boolean(env.cloudinary.apiSecret);
