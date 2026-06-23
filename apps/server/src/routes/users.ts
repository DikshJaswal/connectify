import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload, uploadBuffer } from "../utils/upload.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/me",
  asyncHandler<AuthRequest>(async (req, res) => {
    const user = await User.findById(req.user!.id);
    return res.json({ user });
  })
);

router.patch(
  "/me",
  asyncHandler<AuthRequest>(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2).max(60).optional(),
        bio: z.string().max(180).optional(),
        statusMessage: z.string().max(80).optional(),
        darkMode: z.boolean().optional(),
        privacy: z.object({ showOnline: z.boolean(), readReceipts: z.boolean() }).optional()
      })
      .parse(req.body);

    const user = await User.findByIdAndUpdate(req.user!.id, body, { new: true });
    return res.json({ user });
  })
);

router.post(
  "/me/avatar",
  upload.single("avatar"),
  asyncHandler<AuthRequest>(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Missing avatar file" });
    const file = await uploadBuffer(req.file, "connectify/avatars");
    const user = await User.findByIdAndUpdate(req.user!.id, { avatarUrl: file.url }, { new: true });
    return res.json({ user });
  })
);

router.get(
  "/search",
  asyncHandler<AuthRequest>(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json({ users: [] });
    const users = await User.find({
      _id: { $ne: req.user!.id },
      $or: [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }]
    })
      .select("_id name email avatarUrl bio statusMessage isOnline lastSeen")
      .limit(20);
    return res.json({ users });
  })
);

export default router;
