import { Download, Image, Mic, MicOff, Paperclip, PhoneCall, Send, Trash2, Video, VideoOff, PhoneOff } from "lucide-react";
import { FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { titleFor } from "./ConversationList";
import { useAuth } from "../store/auth";
import { useChat } from "../store/chat";
import type { Conversation } from "../types";

type Props = {
  conversation?: Conversation;
  onBackMobile?: () => void;
  onConversationCleared?: () => void;
};

type CallKind = "audio" | "video";
type CallStatus = "idle" | "incoming" | "calling" | "connected";

export function ChatWindow({ conversation, onBackMobile }: Props) {
  const user = useAuth((state) => state.user);
  const { messages, activeId, sendMessage, socket, typing, deleteConversation, incomingCall, setIncomingCall, selectConversation } = useChat();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [featureMessage, setFeatureMessage] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callKind, setCallKind] = useState<CallKind | null>(null);
  const [callError, setCallError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const activeMessages = activeId ? messages[activeId] ?? [] : [];
  const title = conversation ? titleFor(conversation, user?._id) : "Select a conversation";
  const other = conversation?.members.find((member) => member._id !== user?._id);
  const canCall = Boolean(conversation && conversation.type === "direct" && other);

  const subtitle = useMemo(() => {
    if (!conversation) return "Choose a chat or start one from the sidebar";
    if (conversation.type === "ai") return "Supportive guidance, reflection, study and career help";
    if (conversation.type === "group") return `${conversation.members.length} members`;
    return other?.isOnline ? "Online" : other?.lastSeen ? `Last seen ${new Date(other.lastSeen).toLocaleString()}` : "Offline";
  }, [conversation, other]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  useEffect(() => {
    if (!featureMessage) return;
    const timeout = window.setTimeout(() => setFeatureMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [featureMessage]);

  useEffect(() => {
    if (!socket || !conversation || !canCall || !activeId) return;

    const handleAnswer = async (payload: { conversationId: string; answer: RTCSessionDescriptionInit; fromUserId: string }) => {
      if (payload.conversationId !== activeId || payload.fromUserId === user?._id) return;
      const peer = peerRef.current;
      if (!peer) return;
      await peer.setRemoteDescription(new RTCSessionDescription(payload.answer));
      setCallStatus("connected");
    };

    const handleIce = async (payload: { conversationId: string; candidate: RTCIceCandidateInit; fromUserId: string }) => {
      if (payload.conversationId !== activeId || payload.fromUserId === user?._id) return;
      const peer = peerRef.current;
      if (!peer || !payload.candidate) return;
      try {
        await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        setCallError("Could not add a call candidate");
      }
    };

    const handleDecline = (payload: { conversationId: string; fromUserId: string }) => {
      if (payload.conversationId !== activeId || payload.fromUserId === user?._id) return;
      cleanupCall(false, "The other person declined the call.");
    };

    const handleEnd = (payload: { conversationId: string; fromUserId: string }) => {
      if (payload.conversationId !== activeId || payload.fromUserId === user?._id) return;
      cleanupCall(false, "The call ended.");
    };

    socket.on("call:answer", handleAnswer);
    socket.on("call:ice", handleIce);
    socket.on("call:decline", handleDecline);
    socket.on("call:end", handleEnd);
    return () => {
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice", handleIce);
      socket.off("call:decline", handleDecline);
      socket.off("call:end", handleEnd);
    };
  }, [socket, conversation, activeId, canCall, user?._id]);

  useEffect(() => {
    return () => {
      cleanupCall(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteThread() {
    if (!conversation) return;
    const ok = window.confirm(`Delete ${title}? This will hide the chat from your list.`);
    if (!ok) return;
    await deleteConversation(conversation._id);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activeId || (!body.trim() && files.length === 0) || isSending) return;
    const outgoing = body;
    const outgoingFiles = files;
    setIsSending(true);
    setError("");
    setBody("");
    setFiles([]);
    try {
      await sendMessage(activeId, outgoing, outgoingFiles);
      socket?.emit("typing:stop", { conversationId: activeId });
    } catch (err) {
      setBody(outgoing);
      setFiles(outgoingFiles);
      setError(err instanceof Error ? err.message : "Message failed to send");
    } finally {
      setIsSending(false);
    }
  }

  function onTyping(value: string) {
    setBody(value);
    if (!activeId) return;
    socket?.emit(value ? "typing:start" : "typing:stop", { conversationId: activeId });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function buildPeer(stream: MediaStream, kind: CallKind, conversationId: string) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    peerRef.current = peer;
    remoteStreamRef.current = new MediaStream();

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => undefined);
    }

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => undefined);
      }
      if (remoteStreamRef.current && event.track) {
        remoteStreamRef.current.addTrack(event.track);
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && socket && conversationId && user?._id) {
        socket.emit("call:ice", {
          conversationId,
          candidate: event.candidate.toJSON(),
          fromUserId: user._id
        });
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setCallStatus("connected");
      if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
        setCallError("Call connection was lost.");
      }
    };

    setCallKind(kind);
    return peer;
  }

  async function beginCall(kind: CallKind) {
    if (!conversation || !canCall) return;
    cleanupCall(false);
    setFeatureMessage(`${kind === "video" ? "Video" : "Audio"} call is in progress and will be added soon.`);
  }

  async function acceptCall() {
    if (!socket || !incomingCall || !user) return;
    try {
      setCallError("");
      if (activeId !== incomingCall.conversationId) {
        await selectConversation(incomingCall.conversationId);
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingCall.kind === "video" });
      localStreamRef.current = stream;
      setIsMuted(false);
      setIsVideoOff(false);
      const peer = buildPeer(stream, incomingCall.kind, incomingCall.conversationId);
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call:answer", {
        conversationId: incomingCall.conversationId,
        answer,
        fromUserId: user._id
      });
      setCallStatus("connected");
      setIncomingCall(null);
      pendingOfferRef.current = null;
      await sendMessage(incomingCall.conversationId, `${incomingCall.kind === "video" ? "Video" : "Audio"} call answered`, []);
    } catch (err) {
      cleanupCall(false, err instanceof Error ? err.message : "Could not accept the call");
    }
  }

  function declineCall() {
    cleanupCall(false);
  }

  function cleanupCall(notifyRemote: boolean, message?: string) {
    const conversationId = incomingCall?.conversationId ?? activeId;
    const currentKind = callKind ?? incomingCall?.kind ?? "audio";
    if (notifyRemote && socket && conversationId && user?._id) {
      socket.emit("call:end", { conversationId, fromUserId: user._id });
      void sendMessage(conversationId, `${currentKind === "video" ? "Video" : "Audio"} call ended`, []);
    }

    peerRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerRef.current?.close();
    peerRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    pendingOfferRef.current = null;
    if (incomingCall) setIncomingCall(null);
    setCallKind(null);
    setCallStatus("idle");
    setIsMuted(false);
    setIsVideoOff(false);
    if (message) setCallError(message);
    else setCallError("");
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
  }

  function toggleVideo() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isVideoOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsVideoOff(next);
  }

  if (!conversation) {
    return (
      <main className="grid h-full min-h-0 flex-1 place-items-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_40%),linear-gradient(180deg,_rgba(239,246,255,0.95),_rgba(255,255,255,0.95))] p-6 text-center dark:bg-slate-900 dark:bg-none">
        <div className="max-w-sm rounded-2xl border border-white/70 bg-white/85 px-6 py-8 shadow-[0_20px_70px_rgba(37,99,235,0.10)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-200/60">
            <Send className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Your messages live here</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Start a chat, create a group, or open the AI Companion when you want to think something through.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(180deg,_rgba(248,251,255,1),_rgba(243,248,255,1))] dark:bg-slate-950 dark:bg-none">
      <header className="flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        {onBackMobile && (
          <button
            type="button"
            onClick={onBackMobile}
            className="mr-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-200 md:hidden"
          >
            Chats
          </button>
        )}
        <Avatar name={title} src={conversation.avatarUrl || other?.avatarUrl} ai={conversation.type === "ai"} />
        <div className="min-w-0">
          <h2 className="truncate font-semibold tracking-tight">{title}</h2>
          <p className="truncate text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canCall && (
            <>
              <button
                type="button"
                title="Audio call"
                onClick={() => beginCall("audio")}
                className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/50 dark:hover:text-blue-200"
              >
                <PhoneCall className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Video call"
                onClick={() => beginCall("video")}
                className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/50 dark:hover:text-blue-200"
              >
                <Video className="h-4 w-4" />
              </button>
            </>
          )}
          {conversation.type !== "ai" && (
            <button
              type="button"
              title="Delete chat"
              onClick={deleteThread}
              className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-slate-500 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {featureMessage && (
        <div className="border-b border-blue-100 bg-blue-50 px-5 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
          {featureMessage}
        </div>
      )}

      <section className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 dark:bg-slate-950 dark:bg-none">
        {conversation.type === "ai" && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
            AI Companion can help with reflection, productivity, study planning, and career thinking. It is not a therapist or emergency service.
          </div>
        )}

        {activeMessages.map((message) => {
          const mine = message.sender._id === user?._id;
          const showSender = conversation.type !== "direct" && !mine;
          return (
            <div key={message._id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && <Avatar name={message.sender.name} src={message.sender.avatarUrl} ai={message.isAi} size="sm" />}
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? "bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-blue-200/50" : "border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"}`}>
                {showSender && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-500 dark:text-blue-300">{message.sender.name}</p>}
                {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
                {message.attachments?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.attachments.map((attachment) => (
                      <a
                        key={attachment.url + attachment.fileName}
                        href={attachment.url.startsWith("local://") ? undefined : attachment.url}
                        download
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${mine ? "border-white/25 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/40"}`}
                      >
                        {attachment.mimeType.startsWith("image/") ? <Image className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                        <span className="truncate">{attachment.fileName}</span>
                      </a>
                    ))}
                  </div>
                )}
                <div className={`mt-2 text-[11px] ${mine ? "text-white/80" : "text-slate-400"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
        {activeId && typing[activeId]?.length > 0 && (
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Typing...
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form ref={formRef} onSubmit={submit} className="shrink-0 border-t border-slate-200/80 bg-white/90 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        {files.length > 0 && <p className="mb-2 truncate text-xs text-slate-500">{files.map((file) => file.name).join(", ")}</p>}
        {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}
        <div className="flex items-end gap-2">
          <label title="Attach files" className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/40">
            <Paperclip className="h-4 w-4" />
            <input type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
          </label>
          <textarea
            value={body}
            onChange={(event) => onTyping(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message"
            rows={1}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-blue-700 dark:focus:ring-blue-950/50"
          />
          <button
            title="Send"
            disabled={isSending || (!body.trim() && files.length === 0)}
            className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-200/60 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {incomingCall && callStatus === "idle" && (
        <div className="fixed inset-x-4 bottom-4 z-[65] mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur md:bottom-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Incoming {incomingCall.kind} call</p>
          <p className="mt-2 text-lg font-semibold">{incomingCall.fromUserName}</p>
          <p className="mt-1 text-sm text-slate-300">The call is ringing now.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={acceptCall} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 font-medium text-white">
              Accept
            </button>
            <button onClick={declineCall} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-medium text-white">
              Decline
            </button>
          </div>
        </div>
      )}
      {callStatus !== "idle" && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_90px_rgba(15,23,42,0.55)]">
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="relative min-h-[320px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-900">
                {callKind === "video" ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" style={{ transform: "none" }} />
                ) : (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
                    <Avatar name={title} src={conversation.avatarUrl || other?.avatarUrl} ai={conversation.type === "ai"} size="lg" />
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">{title}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {callStatus === "incoming"
                          ? `${incomingCall?.fromUserName ?? "Someone"} is calling`
                          : callStatus === "calling"
                            ? "Calling..."
                            : "Connected"}
                      </p>
                    </div>
                  </div>
                )}

                {callKind === "video" && (
                  <div className="absolute bottom-4 right-4 h-36 w-52 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-lg">
                    <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" style={{ transform: "none" }} />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    {callStatus === "incoming" ? "Incoming call" : callStatus === "calling" ? "Dialing" : "Call in progress"}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {callError || (callKind === "video" ? "Video and audio are active through the browser." : "Audio call is active through the browser.")}
                  </p>
                </div>

                <div className="grid gap-2">
                  {callStatus === "incoming" ? (
                    <>
                      <button
                        type="button"
                        onClick={acceptCall}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-3 font-medium text-white transition hover:brightness-110"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={declineCall}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition hover:bg-white/10"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={toggleMute}
                        disabled={!localStreamRef.current}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {isMuted ? "Unmute" : "Mute"}
                      </button>
                      {callKind === "video" && (
                        <button
                          type="button"
                          onClick={toggleVideo}
                          disabled={!localStreamRef.current}
                          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                          {isVideoOff ? "Turn camera on" : "Turn camera off"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => cleanupCall(true)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 font-medium text-white transition hover:bg-rose-400"
                      >
                        <PhoneOff className="h-4 w-4" />
                        Hang up
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
