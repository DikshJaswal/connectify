import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

function parseOrigins(value: string | undefined) {
  return (value ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  clientOrigins: parseOrigins(process.env.CLIENT_URL),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/connectify",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
  dnsServers: (process.env.DNS_SERVERS ?? "")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean),
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
