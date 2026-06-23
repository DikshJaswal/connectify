import type { Server } from "http";
import jwt from "jsonwebtoken";
import { Server as SocketServer } from "socket.io";
import { env } from "./config/env.js";
import { Conversation } from "./models/Conversation.js";
import { User } from "./models/User.js";

const onlineUsers = new Map<string, string>();

export function createSocketServer(server: Server) {
  const io = new SocketServer(server, {
    cors: { origin: env.clientUrl, credentials: true }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) return next(new Error("Missing token"));
      const payload = jwt.verify(token, env.jwtSecret) as { id: string };
      socket.data.userId = payload.id;
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true });

    const conversations = await Conversation.find({ members: userId }).select("_id");
    conversations.forEach((conversation) => socket.join(String(conversation._id)));
    io.emit("presence:update", { userId, isOnline: true });

    socket.on("conversation:join", (conversationId: string) => socket.join(conversationId));
    socket.on("typing:start", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("typing:update", { conversationId, userId, isTyping: true });
    });
    socket.on("typing:stop", ({ conversationId }: { conversationId: string }) => {
      socket.to(conversationId).emit("typing:update", { conversationId, userId, isTyping: false });
    });
    socket.on(
      "call:offer",
      (payload: {
        conversationId: string;
        kind: "audio" | "video";
        offer: unknown;
        fromUserId: string;
        fromUserName: string;
      }) => {
        socket.to(payload.conversationId).emit("call:invite", {
          conversationId: payload.conversationId,
          kind: payload.kind,
          offer: payload.offer,
          fromUserId: payload.fromUserId,
          fromUserName: payload.fromUserName
        });
      }
    );
    socket.on(
      "call:answer",
      (payload: { conversationId: string; answer: unknown; fromUserId: string }) => {
        socket.to(payload.conversationId).emit("call:answer", payload);
      }
    );
    socket.on(
      "call:ice",
      (payload: { conversationId: string; candidate: unknown; fromUserId: string }) => {
        socket.to(payload.conversationId).emit("call:ice", payload);
      }
    );
    socket.on("call:decline", ({ conversationId, fromUserId }: { conversationId: string; fromUserId: string }) => {
      socket.to(conversationId).emit("call:decline", { conversationId, fromUserId });
    });
    socket.on("call:end", ({ conversationId, fromUserId }: { conversationId: string; reason?: string; fromUserId: string }) => {
      socket.to(conversationId).emit("call:end", { conversationId, fromUserId, reason: "ended" });
    });

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit("presence:update", { userId, isOnline: false, lastSeen: new Date() });
    });
  });

  return io;
}
