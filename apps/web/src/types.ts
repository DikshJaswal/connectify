export type User = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  statusMessage?: string;
  isOnline?: boolean;
  lastSeen?: string;
  darkMode?: boolean;
  privacy?: {
    showOnline: boolean;
    readReceipts: boolean;
  };
};

export type Attachment = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type Message = {
  _id: string;
  conversation: string;
  sender: User;
  body: string;
  attachments: Attachment[];
  readBy: string[];
  deliveredTo: string[];
  isAi: boolean;
  createdAt: string;
};

export type Conversation = {
  _id: string;
  type: "direct" | "group" | "ai";
  name?: string;
  avatarUrl?: string;
  description?: string;
  members: User[];
  admins: string[];
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadBy: string[];
  updatedAt: string;
};
