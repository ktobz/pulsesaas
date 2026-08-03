"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MessageBubble } from "@/components/MessageBubble";

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:4003";

interface Room { _id?: string; id?: string; name?: string; participants: string[]; lastMessage?: string; }
interface Message { _id?: string; id?: string; roomId: string; senderId: string; content: string; createdAt?: string; }

const defaultRooms: Room[] = [
  { _id: "general", name: "General", participants: [] },
  { _id: "support", name: "Support", participants: [] },
  { _id: "random", name: "Random", participants: [] },
];

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState("general");
  const [rooms, setRooms] = useState<Room[]>(defaultRooms);
  const [typingUsers, setTypingUsers] = useState<{ roomId: string; userId: string }[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const senderId = session?.user?.email || "anonymous";

  useEffect(() => {
    const socket = io(CHAT_URL, { timeout: 8000 });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("connect_error", () => setConnected(false));
    socket.on("disconnect", () => setConnected(false));

    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user-typing", (data: { roomId: string; userId: string }) => {
      setTypingUsers((prev) => [...prev.filter((t) => t.userId !== data.userId), data]);
      setTimeout(() => setTypingUsers((prev) => prev.filter((t) => t.userId !== data.userId)), 3000);
    });

    socket.emit("join-room", "general");

    if (connected) {
      fetch(`${CHAT_URL}/rooms`).then((r) => r.json()).then((d) => d.success && setRooms(d.data)).catch(() => {});
    }

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUsers]);

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="glass p-10 text-center"><div className="text-5xl mb-4">&#x1F4AC;</div><h2 className="text-xl font-bold mb-2">Sign in to chat</h2><p className="text-sm text-[var(--fg-secondary)] mb-6">Real-time chat via WebSocket (port 4003)</p><a href="/auth/login" className="btn-primary">Sign In</a></div></div>;

  const activeTyping = typingUsers.filter((t) => t.roomId === activeRoom && t.userId !== senderId);

  function switchRoom(roomId: string) {
    socketRef.current?.emit("leave-room", activeRoom);
    setActiveRoom(roomId);
    setMessages([]);
    socketRef.current?.emit("join-room", roomId);
    fetch(`${CHAT_URL}/rooms/${roomId}/messages`).then((r) => r.json()).then((d) => d.success && setMessages(d.data)).catch(() => {});
    setMobileSidebarOpen(false);
  }

  function sendMessage() {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("send-message", { roomId: activeRoom, senderId, content: input.trim() });
    setInput("");
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button className="lg:hidden btn-secondary text-xs" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>{mobileSidebarOpen ? "Close" : "Rooms"}</button>
        <span className={`glow-dot ${connected ? "glow-dot-active" : "glow-dot-inactive"}`} />
        <span className="text-xs text-[var(--fg-muted)]">{connected ? "Connected (WebSocket)" : "Disconnected — chat on port 4003"}</span>
      </div>

      <div className="flex gap-0 h-[72vh] rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
        <div className={`${mobileSidebarOpen ? "absolute z-20 inset-0" : "hidden lg:flex"} lg:relative flex flex-col w-full lg:w-64 bg-surface-low border-r border-[var(--border-subtle)] shrink-0`}>
          <div className="p-4 border-b border-[var(--border-subtle)]"><h3 className="text-xs font-semibold uppercase text-[var(--fg-muted)]">Rooms</h3></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.map((room) => (
              <button key={room._id || room.id} onClick={() => switchRoom(room._id || room.id || "")} className={`w-full text-left p-3 rounded-xl transition-all ${activeRoom === (room._id || room.id) ? "bg-brand-600/20 border border-brand-500/30" : "hover:bg-surface-mid border border-transparent"}`}>
                <span className="font-semibold text-sm"># {room.name || room._id || room.id}</span>
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-[var(--border-subtle)]"><div className="flex items-center gap-2 text-xs text-[var(--fg-secondary)]"><span className="glow-dot glow-dot-active" /><span>Online</span></div></div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
            <div><h2 className="font-bold text-sm">{rooms.find((r) => (r._id || r.id) === activeRoom)?.name || activeRoom}</h2><p className="text-[10px] text-[var(--fg-muted)]">{messages.length} messages</p></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-center"><div className="text-5xl mb-4">{connected ? "👋" : "🔴"}</div><p className="text-sm text-[var(--fg-secondary)]">{connected ? "No messages yet. Say hello!" : "Chat service not connected"}</p></div>}
            {messages.map((msg, i) => <MessageBubble key={(msg._id || msg.id || i)} content={msg.content} senderId={msg.senderId} createdAt={msg.createdAt} isSelf={msg.senderId === senderId} />)}
            {activeTyping.length > 0 && <div className="typing-indicator animate-fade-in"><div className="typing-dots"><span /><span /><span /></div><span>{activeTyping.map((t) => t.userId).join(", ")} typing...</span></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-[var(--border-subtle)] shrink-0">
            <div className="flex gap-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={connected ? `Message #${activeRoom}` : "Chat service not connected..."} disabled={!connected} className="input-glass flex-1" />
              <button onClick={sendMessage} disabled={!connected || !input.trim()} className="btn-primary px-5"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
