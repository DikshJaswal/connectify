import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { api, API_URL } from "../lib/api";
import type { Conversation, Message } from "../types";

type ChatState = {
  conversations: Conversation[];
  activeId: string | null;
  messages: Record<string, Message[]>;
  socket: Socket | null;
  socketStatus: "idle" | "connecting" | "connected" | "disconnected" | "error";
  incomingCall: {
    conversationId: string;
    kind: "audio" | "video";
    offer: RTCSessionDescriptionInit;
    fromUserId: string;
    fromUserName: string;
  } | null;
  typing: Record<string, string[]>;
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  ensureAiConversation: () => Promise<void>;
  sendMessage: (conversationId: string, body: string, files: File[]) => Promise<void>;
  createGroup: (name: string, memberIds: string[], description?: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setIncomingCall: (call: ChatState["incomingCall"]) => void;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  setActiveId: (id: string | null) => void;
};

function mergeMessage(messages: Message[], message: Message) {
  if (messages.some((item) => item._id === message._id)) return messages;
  return [...messages, message];
}

export const useChat = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: {},
  socket: null,
  socketStatus: "idle",
  incomingCall: null,
  typing: {},
  loadConversations: async () => {
    const { data } = await api.get("/conversations");
    set({ conversations: data.conversations });
  },
  selectConversation: async (id) => {
    set({ activeId: id });
    get().socket?.emit("conversation:join", id);
    const { data } = await api.get(`/conversations/${id}/messages`);
    set((state) => ({ messages: { ...state.messages, [id]: data.messages } }));
    await api.post(`/conversations/${id}/read`);
  },
  ensureAiConversation: async () => {
    const { data } = await api.get("/conversations/ai");
    set((state) => ({
      conversations: state.conversations.some((item) => item._id === data.conversation._id)
        ? state.conversations
        : [data.conversation, ...state.conversations],
      activeId: data.conversation._id
    }));
    await get().selectConversation(data.conversation._id);
  },
  sendMessage: async (conversationId, body, files) => {
    const form = new FormData();
    form.append("body", body);
    files.forEach((file) => form.append("attachments", file));
    const { data } = await api.post(`/conversations/${conversationId}/messages`, form);
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: mergeMessage(state.messages[conversationId] ?? [], data.message)
      }
    }));
    await get().loadConversations();
  },
  createGroup: async (name, memberIds, description) => {
    const { data } = await api.post("/conversations/group", { name, memberIds, description });
    set((state) => ({ conversations: [data.conversation, ...state.conversations], activeId: data.conversation._id }));
  },
  deleteConversation: async (conversationId) => {
    await api.delete(`/conversations/${conversationId}`);
    set((state) => {
      const conversations = state.conversations.filter((conversation) => conversation._id !== conversationId);
      const activeId = state.activeId === conversationId ? conversations[0]?._id ?? null : state.activeId;
      const messages = { ...state.messages };
      delete messages[conversationId];
      return { conversations, activeId, messages };
    });
  },
  setIncomingCall: (call) => set({ incomingCall: call }),
  connectSocket: (token) => {
    get().socket?.removeAllListeners();
    get().socket?.disconnect();
    set({ socketStatus: "connecting" });
    const socket = io(API_URL, { auth: { token } });
    socket.on("connect", () => set({ socketStatus: "connected" }));
    socket.on("disconnect", () => set({ socketStatus: "disconnected" }));
    socket.on("connect_error", () => set({ socketStatus: "error" }));
    socket.on(
      "call:invite",
      (payload: {
        conversationId: string;
        kind: "audio" | "video";
        offer: RTCSessionDescriptionInit;
        fromUserId: string;
        fromUserName: string;
      }) => {
        set({ incomingCall: payload });
      }
    );
    socket.on("message:new", ({ conversationId, message }: { conversationId: string; message: Message }) => {
      set((state) => ({
        messages: { ...state.messages, [conversationId]: mergeMessage(state.messages[conversationId] ?? [], message) }
      }));
      get().loadConversations();
    });
    socket.on("typing:update", ({ conversationId, userId, isTyping }) => {
      set((state) => {
        const current = state.typing[conversationId] ?? [];
        return {
          typing: {
            ...state.typing,
            [conversationId]: isTyping ? Array.from(new Set([...current, userId])) : current.filter((id) => id !== userId)
          }
        };
      });
    });
    set({ socket });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    socket?.removeAllListeners();
    socket?.disconnect();
    set({ socket: null, socketStatus: "idle" });
  },
  setActiveId: (id) => set({ activeId: id })
}));
