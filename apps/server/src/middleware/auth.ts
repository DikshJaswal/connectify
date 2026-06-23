import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export type AuthRequest = Request & {
  user?: {
    id: string;
    email: string;
    name: string;
  };
};

export function signToken(user: { _id: unknown; email: string; name: string }) {
  return jwt.sign({ id: String(user._id), email: user.email, name: user.name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: "Missing authentication token" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { id: string; email: string; name: string };
    const user = await User.findById(payload.id).select("_id email name");
    if (!user) return res.status(401).json({ message: "User no longer exists" });
    req.user = { id: String(user._id), email: user.email, name: user.name };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
