import { AlertCircle, Bot, LogOut, MessageSquarePlus, Search, Settings, Users, Wifi, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { useAuth } from "../store/auth";
import { useChat } from "../store/chat";
import type { Conversation } from "../types";

type Props = {
  onNewChat: () => void;
  onGroup: () => void;
  onSettings: () => void;
  onOpenConversation?: () => void;
};

function titleFor(conversation: Conversation, currentUserId?: string) {
  if (conversation.type === "ai") return "AI Companion";
  if (conversation.type === "group") return conversation.name ?? "Group";
  return conversation.members.find((member) => member._id !== currentUserId)?.name ?? "Direct chat";
}

function subtitleFor(conversation: Conversation, currentUserId?: string) {
  if (conversation.lastMessage?.body) return conversation.lastMessage.body;
  if (conversation.type === "group") return `${conversation.members.length} members`;
  const other = conversation.members.find((member) => member._id !== currentUserId);
  return other?.statusMessage ?? "Start a conversation";
}

export function ConversationList({ onNewChat, onGroup, onSettings, onOpenConversation }: Props) {
  const { user, logout } = useAuth();
  const { conversations, activeId, selectConversation, ensureAiConversation, socketStatus } = useChat();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return conversations.filter((conversation) => titleFor(conversation, user?._id).toLowerCase().includes(q));
  }, [conversations, query, user?._id]);

  const socketLabel =
    socketStatus === "connected" ? "Live" : socketStatus === "connecting" ? "Connecting" : socketStatus === "error" ? "Retrying" : "Offline";

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-white/70 bg-white/90 shadow-[0_20px_70px_rgba(37,99,235,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <header className="border-b border-slate-200/80 p-4 dark:border-slate-800">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={user?.name ?? "Me"} src={user?.avatarUrl} />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Connectify</h1>
              <p className="truncate text-xs text-slate-500">{user?.statusMessage ?? "Available"}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                {socketStatus === "connected" ? <Wifi className="h-3 w-3" /> : socketStatus === "error" ? <AlertCircle className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {socketLabel}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button title="Settings" onClick={onSettings} className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-500 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/50 dark:hover:text-blue-200">
              <Settings className="h-4 w-4" />
            </button>
            <button title="Logout" onClick={logout} className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-500 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/50 dark:hover:text-blue-200">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:bg-slate-950"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={onNewChat} className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-blue-200/60 transition hover:brightness-105 dark:shadow-none">
            <MessageSquarePlus className="h-4 w-4" /> Chat
          </button>
          <button onClick={onGroup} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/40">
            <Users className="h-4 w-4" /> Group
          </button>
          <button onClick={ensureAiConversation} className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-100 transition hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-200 dark:ring-blue-900/60 dark:hover:bg-blue-950/40">
            <Bot className="h-4 w-4" /> AI
          </button>
        </div>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {filtered.map((conversation) => {
          const active = conversation._id === activeId;
          const name = titleFor(conversation, user?._id);
          const unread = conversation.unreadBy?.includes(user?._id ?? "");
          const other = conversation.members.find((member) => member._id !== user?._id);
          return (
            <button
              key={conversation._id}
              onClick={() => {
                selectConversation(conversation._id);
                onOpenConversation?.();
              }}
              className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition dark:border-slate-900 ${
                active ? "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-slate-900" : "hover:bg-slate-50/80 dark:hover:bg-slate-900"
              }`}
            >
              <div className="relative">
                <Avatar name={name} src={conversation.avatarUrl || other?.avatarUrl} ai={conversation.type === "ai"} />
                {other?.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-slate-950" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{name}</p>
                  {conversation.lastMessageAt && <span className="shrink-0 text-xs text-slate-400">{new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
                <p className="truncate text-sm text-slate-500">{subtitleFor(conversation, user?._id)}</p>
              </div>
              {unread && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-500">
            <p className="font-medium text-slate-700 dark:text-slate-200">No conversations yet</p>
            <p className="mt-1 text-xs text-slate-500">Start a direct chat, create a group, or open AI to begin.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export { titleFor };
