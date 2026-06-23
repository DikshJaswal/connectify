import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { getAiCompanionReply } from "../services/aiCompanion.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload, uploadBuffer } from "../utils/upload.js";

const router = Router();
router.use(requireAuth);

const populateConversation = [
  { path: "members", select: "_id name email avatarUrl statusMessage isOnline lastSeen privacy" },
  { path: "lastMessage" }
];

router.get(
  "/",
  asyncHandler<AuthRequest>(async (req, res) => {
    const conversations = await Conversation.find({
      members: req.user!.id,
      hiddenBy: { $ne: req.user!.id }
    })
      .populate(populateConversation)
      .sort({ lastMessageAt: -1, updatedAt: -1 });
    return res.json({ conversations });
  })
);

router.post(
  "/direct",
  asyncHandler<AuthRequest>(async (req, res) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const members = [new mongoose.Types.ObjectId(req.user!.id), new mongoose.Types.ObjectId(userId)].sort();
    let conversation = await Conversation.findOne({ type: "direct", members: { $all: members, $size: 2 } });
    if (!conversation) conversation = await Conversation.create({ type: "direct", members });
    else {
      conversation.hiddenBy = conversation.hiddenBy.filter((member) => String(member) !== req.user!.id) as never;
      await conversation.save();
    }
    await conversation.populate(populateConversation);
    return res.status(201).json({ conversation });
  })
);

router.post(
  "/group",
  asyncHandler<AuthRequest>(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2).max(80),
        description: z.string().max(220).optional(),
        memberIds: z.array(z.string()).min(1)
      })
      .parse(req.body);

    const memberIds = Array.from(new Set([req.user!.id, ...body.memberIds]));
    const conversation = await Conversation.create({
      type: "group",
      name: body.name,
      description: body.description ?? "",
      members: memberIds,
      admins: [req.user!.id]
    });
    await conversation.populate(populateConversation);
    return res.status(201).json({ conversation });
  })
);

router.patch(
  "/:id/group",
  asyncHandler<AuthRequest>(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2).max(80).optional(),
        description: z.string().max(220).optional(),
        addMemberIds: z.array(z.string()).optional(),
        removeMemberIds: z.array(z.string()).optional()
      })
      .parse(req.body);

    const conversation = await Conversation.findOne({ _id: req.params.id, type: "group", admins: req.user!.id });
    if (!conversation) return res.status(404).json({ message: "Group not found or permission denied" });
    if (body.name) conversation.name = body.name;
    if (body.description !== undefined) conversation.description = body.description;
    if (body.addMemberIds) conversation.members = Array.from(new Set([...conversation.members.map(String), ...body.addMemberIds])) as never;
    if (body.removeMemberIds) {
      conversation.members = conversation.members.filter((member) => !body.removeMemberIds!.includes(String(member))) as never;
    }
    await conversation.save();
    await conversation.populate(populateConversation);
    return res.json({ conversation });
  })
);

router.post(
  "/:id/avatar",
  upload.single("avatar"),
  asyncHandler<AuthRequest>(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Missing avatar file" });
    const conversation = await Conversation.findOne({ _id: req.params.id, type: "group", admins: req.user!.id });
    if (!conversation) return res.status(404).json({ message: "Group not found or permission denied" });
    const file = await uploadBuffer(req.file, "connectify/groups");
    conversation.avatarUrl = file.url;
    await conversation.save();
    await conversation.populate(populateConversation);
    return res.json({ conversation });
  })
);

router.get(
  "/ai",
  asyncHandler<AuthRequest>(async (req, res) => {
    let conversation = await Conversation.findOne({ type: "ai", members: req.user!.id });
    if (!conversation) {
      conversation = await Conversation.create({ type: "ai", name: "AI Companion", members: [req.user!.id] });
    }
    await conversation.populate(populateConversation);
    return res.json({ conversation });
  })
);

router.get(
  "/:id/messages",
  asyncHandler<AuthRequest>(async (req, res) => {
    const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user!.id });
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    const messages = await Message.find({ conversation: conversation._id })
      .populate("sender", "_id name avatarUrl")
      .sort({ createdAt: 1 })
      .limit(100);
    return res.json({ messages });
  })
);

router.post(
  "/:id/messages",
  upload.array("attachments", 5),
  asyncHandler<AuthRequest>(async (req, res) => {
    const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user!.id });
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    const body = String(req.body.body ?? "").trim();
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!body && files.length === 0) return res.status(400).json({ message: "Message body or attachment required" });

    const attachments = await Promise.all(files.map((file) => uploadBuffer(file, "connectify/messages")));
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user!.id,
      body,
      attachments,
      readBy: [req.user!.id]
    });
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    conversation.unreadBy = conversation.members.filter((member) => String(member) !== req.user!.id) as never;
    await conversation.save();
    await message.populate("sender", "_id name avatarUrl");

    req.app.get("io").to(String(conversation._id)).emit("message:new", { conversationId: String(conversation._id), message });

    if (conversation.type === "ai" && body) {
      const recentMessages = await Message.find({ conversation: conversation._id })
        .populate("sender", "_id name avatarUrl")
        .sort({ createdAt: -1 })
        .limit(8);
      const history = recentMessages
        .reverse()
        .slice(0, -1)
        .map((entry) => ({
          role: entry.isAi ? ("assistant" as const) : ("user" as const),
          content: String(entry.body ?? "").trim()
        }))
        .filter((entry) => entry.content.length > 0);

      const aiText = await getAiCompanionReply(body, history);
      const aiSender = await User.findOneAndUpdate(
        { email: "ai@connectify.local" },
        {
          name: "AI Companion",
          email: "ai@connectify.local",
          passwordHash: "system",
          avatarUrl: "",
          statusMessage: "Here to help you reflect"
        },
        { upsert: true, new: true }
      );
      const aiMessage = await Message.create({
        conversation: conversation._id,
        sender: aiSender._id,
        body: aiText,
        readBy: [],
        isAi: true
      });
      conversation.lastMessage = aiMessage._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();
      await aiMessage.populate("sender", "_id name avatarUrl");
      req.app.get("io").to(String(conversation._id)).emit("message:new", { conversationId: String(conversation._id), message: aiMessage });
    }

    return res.status(201).json({ message });
  })
);

router.post(
  "/:id/read",
  asyncHandler<AuthRequest>(async (req, res) => {
    await Message.updateMany({ conversation: req.params.id }, { $addToSet: { readBy: req.user!.id } });
    await Conversation.findByIdAndUpdate(req.params.id, { $pull: { unreadBy: req.user!.id } });
    req.app.get("io").to(req.params.id).emit("message:read", { conversationId: req.params.id, userId: req.user!.id });
    return res.json({ ok: true });
  })
);

router.delete(
  "/:id",
  asyncHandler<AuthRequest>(async (req, res) => {
    const conversation = await Conversation.findOne({ _id: req.params.id, members: req.user!.id });
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    conversation.hiddenBy = Array.from(new Set([...(conversation.hiddenBy ?? []).map(String), req.user!.id])) as never;
    await conversation.save();
    return res.json({ ok: true });
  })
);

router.get(
  "/search/messages",
  asyncHandler<AuthRequest>(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.json({ messages: [] });
    const conversations = await Conversation.find({ members: req.user!.id }).select("_id");
    const messages = await Message.find({
      conversation: { $in: conversations.map((conversation) => conversation._id) },
      body: new RegExp(q, "i")
    })
      .populate("sender", "_id name avatarUrl")
      .limit(30)
      .sort({ createdAt: -1 });
    return res.json({ messages });
  })
);

export default router;
