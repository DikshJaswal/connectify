import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { ZodError } from "zod";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";
import userRoutes from "./routes/users.js";
import { createSocketServer } from "./socket.js";

const app = express();
const server = createServer(app);
const io = createSocketServer(server);

app.set("io", io);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, limit: 180 }));

app.get("/health", (_req, res) => res.json({ ok: true, name: "connectify-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) return res.status(400).json({ message: "Invalid request", issues: error.flatten() });
  console.error(error);
  return res.status(500).json({ message: "Something went wrong" });
});

await connectDb();

server.listen(env.port, () => {
  console.log(`Connectify API listening on http://localhost:${env.port}`);
});
