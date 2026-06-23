import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ChatWindow } from "../components/ChatWindow";
import { ConversationList } from "../components/ConversationList";
import { GroupModal, NewChatModal, SettingsModal } from "../components/Modals";
import { useAuth } from "../store/auth";
import { useChat } from "../store/chat";

export default function App() {
  const { user, token, isLoading, hydrate } = useAuth();
  const { conversations, activeId, loadConversations, connectSocket, disconnectSocket, incomingCall } = useChat();
  const [modal, setModal] = useState<"chat" | "group" | "settings" | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isMobile && activeId) setMobileView("chat");
  }, [activeId, isMobile]);

  useEffect(() => {
    if (isMobile && incomingCall) setMobileView("chat");
  }, [incomingCall, isMobile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", Boolean(user?.darkMode));
  }, [user?.darkMode]);

  useEffect(() => {
    if (!token || !user) return;
    loadConversations();
    connectSocket(token);
    return () => disconnectSocket();
  }, [token, user, loadConversations, connectSocket, disconnectSocket]);

  const activeConversation = useMemo(() => conversations.find((conversation) => conversation._id === activeId), [conversations, activeId]);

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,_#f8fbff,_#edf4ff)] text-ink dark:bg-slate-950 dark:bg-none dark:text-slate-100">Loading Connectify...</div>;
  }

  if (!token || !user) return <Navigate to="/login" replace />;

  return (
    <div className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_32%),linear-gradient(180deg,_#f8fbff,_#edf4ff)] text-ink dark:bg-slate-950 dark:bg-none dark:text-slate-100">
      <div className="mx-auto grid h-full min-h-0 max-w-[1500px] grid-cols-1 overflow-hidden border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(37,99,235,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:grid-cols-[360px_minmax(0,1fr)]">
        {(!isMobile || mobileView === "list") && (
          <ConversationList
            onNewChat={() => setModal("chat")}
            onGroup={() => setModal("group")}
            onSettings={() => setModal("settings")}
            onOpenConversation={() => isMobile && setMobileView("chat")}
          />
        )}
        {(!isMobile || mobileView === "chat") && (
          <ChatWindow
            conversation={activeConversation}
            onBackMobile={isMobile ? () => setMobileView("list") : undefined}
          />
        )}
      </div>
      {modal === "chat" && <NewChatModal onClose={() => setModal(null)} />}
      {modal === "group" && <GroupModal onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal onClose={() => setModal(null)} />}
    </div>
  );
}
