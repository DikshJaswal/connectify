import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { Avatar } from "./Avatar";
import { api, apiError } from "../lib/api";
import { useAuth } from "../store/auth";
import { useChat } from "../store/chat";
import type { User } from "../types";

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/70 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button title="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/50 dark:hover:text-blue-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserSearch({ selected, setSelected }: { selected: string[]; setSelected: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const selectedUsers = selected.map((id) => users.find((user) => user._id === id)).filter(Boolean) as User[];

  async function search(value: string) {
    setQuery(value);
    if (!value.trim()) return setUsers([]);
    const { data } = await api.get(`/users/search?q=${encodeURIComponent(value)}`);
    setUsers(data.users);
  }

  return (
    <div>
      <input value={query} onChange={(event) => search(event.target.value)} placeholder="Search users" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
      {selectedUsers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span key={user._id} className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
              {user.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
        {users.map((user) => {
          const checked = selected.includes(user._id);
          return (
            <label key={user._id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-blue-950/30">
              <input type="checkbox" checked={checked} onChange={() => setSelected(checked ? selected.filter((id) => id !== user._id) : [...selected, user._id])} />
              <span className="min-w-0">
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs text-slate-500">{user.email}</span>
              </span>
            </label>
          );
        })}
        {users.length === 0 && <p className="p-4 text-sm text-slate-500">Search by name or email to add people.</p>}
      </div>
    </div>
  );
}

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const loadConversations = useChat((state) => state.loadConversations);
  const selectConversation = useChat((state) => state.selectConversation);

  async function start() {
    if (!selected[0]) return;
    const { data } = await api.post("/conversations/direct", { userId: selected[0] });
    await loadConversations();
    await selectConversation(data.conversation._id);
    onClose();
  }

  return (
    <ModalFrame title="New Chat" onClose={onClose}>
      <UserSearch selected={selected.slice(0, 1)} setSelected={(ids) => setSelected(ids.slice(-1))} />
      <button onClick={start} disabled={!selected[0]} className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 font-medium text-white shadow-sm shadow-blue-200/60 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none">
        Start chat
      </button>
    </ModalFrame>
  );
}

export function GroupModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const createGroup = useChat((state) => state.createGroup);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await createGroup(String(form.get("name")), selected, String(form.get("description") ?? ""));
      onClose();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <ModalFrame title="Create Group" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input name="name" required minLength={2} placeholder="Group name" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
        <textarea name="description" placeholder="Group info" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
        <UserSearch selected={selected} setSelected={setSelected} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 font-medium text-white shadow-sm shadow-blue-200/60 transition hover:brightness-105 dark:shadow-none">Create group</button>
      </form>
    </ModalFrame>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await api.patch("/users/me", {
        name: form.get("name"),
        bio: form.get("bio"),
        statusMessage: form.get("statusMessage"),
        darkMode: form.get("darkMode") === "on",
        privacy: {
          showOnline: form.get("showOnline") === "on",
          readReceipts: form.get("readReceipts") === "on"
        }
      });
      updateUser(data.user);
      document.documentElement.classList.toggle("dark", Boolean(data.user.darkMode));
      onClose();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    const { data } = await api.post("/users/me/avatar", form);
    updateUser(data.user);
  }

  return (
    <ModalFrame title="Profile Settings" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
          <Avatar name={user?.name ?? "Me"} src={user?.avatarUrl} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <input name="name" defaultValue={user?.name} required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
        <textarea name="bio" defaultValue={user?.bio} placeholder="Bio" className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
        <input name="statusMessage" defaultValue={user?.statusMessage} placeholder="Status message" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50" />
        <label className="block text-sm">
          Avatar image
          <input type="file" accept="image/*" onChange={(event) => uploadAvatar(event.target.files?.[0])} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/40 dark:file:text-blue-200" />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
          <span>
            <span className="block font-medium">Dark mode</span>
            <span className="block text-xs text-slate-500">Use the darker workspace theme</span>
          </span>
          <input name="darkMode" type="checkbox" defaultChecked={user?.darkMode} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
          <span>
            <span className="block font-medium">Show online status</span>
            <span className="block text-xs text-slate-500">Let others see when you are active</span>
          </span>
          <input name="showOnline" type="checkbox" defaultChecked={user?.privacy?.showOnline ?? true} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
          <span>
            <span className="block font-medium">Read receipts</span>
            <span className="block text-xs text-slate-500">Mark messages as read for people in this conversation</span>
          </span>
          <input name="readReceipts" type="checkbox" defaultChecked={user?.privacy?.readReceipts ?? true} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 font-medium text-white shadow-sm shadow-blue-200/60 transition hover:brightness-105 dark:shadow-none">Save settings</button>
      </form>
    </ModalFrame>
  );
}
