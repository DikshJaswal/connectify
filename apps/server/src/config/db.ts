import dns from "dns";
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  if (env.dnsServers.length > 0) {
    dns.setServers(env.dnsServers);
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
}
