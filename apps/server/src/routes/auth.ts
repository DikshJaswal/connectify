import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth.js";
import { User, type UserDoc } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8)
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email is already registered" });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({ ...body, email: body.email.toLowerCase(), passwordHash });
    const token = signToken(user);
    return res.status(201).json({ token, user });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = (await User.findOne({ email: body.email.toLowerCase() })) as UserDoc | null;
    if (!user || !(await user.comparePassword(body.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    return res.json({ token, user });
  })
);

export default router;
