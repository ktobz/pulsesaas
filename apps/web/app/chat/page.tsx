"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MessageBubble } from "@/components/MessageBubble";

const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:4003";

interface Room {
  _id: string;
  name?: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: string;
}

interface ChatMessage {
  _id?: string;
  roomId: string;
  senderId: string;
  content: string;
  type?: string;
  createdAt?: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [activeRoom, setActiveRoom] = useState("general");
  const [rooms, setRooms] = useState<Room[]>([
    { _id: "general", name: "General", participants: [], lastMessage: "", updatedAt: new Date().toISOString() },
    { _id: "support", name: "Support", participants: [], lastMessage: "", updatedAt: new Date().toISOString() },
    { _id: "random", name: "Random", participants: [], lastMessage: "", updatedAt: new Date().toISOString() },
  ]);
  const [typingUsers, setTypingUsers] = useState<{ roomId: string; userId: string }[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>(["general"]);
  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const senderId = session?.user?.email || "anonymous";

  useEffect(() => {
    const socket = io(CHAT_URL, { timeout: 8000 });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(false);
    });
    socket.on("connect_error", () => {
      setConnectionError(true);
      setConnected(false);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("new-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on("user-joined", (data: { roomId: string; userId: string }) => {
      setOnlineUsers((prev) => [...new Set([...prev, data.roomId])]);
    });
    socket.on("user-left", (data: { roomId: string; userId: string }) => {
      setOnlineUsers((prev) =>
        prev.filter((u) => u !== data.roomId)
      );
    });
    socket.on("user-typing", (data: { roomId: string; userId: string }) => {
      setTypingUsers((prev) => [...prev.filter((t) => t.userId !== data.userId), data]);
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((t) => t.userId !== data.userId));
      }, 3000);
    });

    socket.emit("join-room", activeRoom);

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  function switchRoom(roomId: string) {
    socketRef.current?.emit("leave-room", activeRoom);
    setActiveRoom(roomId);
    setMessages([]);
    socketRef.current?.emit("join-room", roomId);
    setMobileSidebarOpen(false);
  }

  function sendMessage() {
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit("send-message", {
      roomId: activeRoom,
      senderId,
      content: input.trim(),
    });
    setInput("");
  }

  function handleTyping() {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { roomId: activeRoom, userId: senderId });
  }

  function createRoom() {
    if (!newRoomName.trim()) return;
    const roomId = newRoomName.toLowerCase().replace(/\s+/g, "-");
    setRooms((prev) => [...prev, { _id: roomId, name: newRoomName, participants: [], lastMessage: "", updatedAt: new Date().toISOString() }]);
    switchRoom(roomId);
    setNewRoomName("");
    setShowRoomCreator(false);
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading session...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="glass p-10 text-center">
          <div className="text-5xl mb-4">&#x1F4AC;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to chat</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Join real-time conversations with your team.</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  const activeTyping = typingUsers.filter((t) => t.roomId === activeRoom && t.userId !== senderId);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-4">
        <button
          className="lg:hidden btn-secondary text-xs"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          {mobileSidebarOpen ? "Close" : "Rooms"}
        </button>
        <div className="flex items-center gap-2">
          <span className={`glow-dot ${connected ? "glow-dot-active" : "glow-dot-inactive"}`} />
          <span className="text-xs text-[var(--fg-secondary)]">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {connectionError && (
        <div className="glass p-4 mb-4 text-sm border border-amber-500/20 bg-amber-500/5 text-amber-400">
          Chat service not running. Start it with: <code className="font-mono text-xs">pnpm run dev --filter=@saas/chat-service</code>
        </div>
      )}

      <div className="flex gap-0 h-[72vh] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-subtle)]">
        {/* Sidebar */}
        <div
          className={`${
            mobileSidebarOpen ? "absolute z-20 inset-0 rounded-[var(--radius-lg)]" : "hidden lg:flex"
          } lg:relative flex flex-col w-full lg:w-64 bg-surface-low border-r border-[var(--border-subtle)] shrink-0`}
        >
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Rooms</h3>
              <button
                onClick={() => setShowRoomCreator(!showRoomCreator)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-mid text-[var(--fg-secondary)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            {showRoomCreator && (
              <div className="mt-3 flex gap-2">
                <input
                  className="input-glass flex-1 text-xs py-2"
                  placeholder="Room name..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createRoom()}
                />
                <button onClick={createRoom} className="btn-primary text-xs py-2 px-3">Add</button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.map((room) => (
              <button
                key={room._id}
                onClick={() => switchRoom(room._id)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  activeRoom === room._id
                    ? "bg-brand-600/20 border border-brand-500/30 text-white"
                    : "hover:bg-surface-mid text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{room.name === "General" ? "#" : "\uD83D\uDCAC"}</span>
                  <span className="font-semibold text-sm truncate">{room.name || room._id}</span>
                </div>
                {room.lastMessage && (
                  <p className="text-[10px] text-[var(--fg-muted)] mt-1 truncate pl-7">{room.lastMessage}</p>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-[var(--border-subtle)]">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-2">Online</h3>
            <div className="flex items-center gap-2 text-xs text-[var(--fg-secondary)]">
              <span className="glow-dot glow-dot-active" />
              <span>{connected ? "You are online" : "Connecting..."}</span>
            </div>
            {connected && (
              <p className="text-[10px] text-[var(--fg-muted)] mt-1">Room: {activeRoom}</p>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Room header */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-bold text-sm">
                {rooms.find((r) => r._id === activeRoom)?.name || activeRoom}
              </h2>
              <p className="text-[10px] text-[var(--fg-muted)]">#{activeRoom}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--fg-muted)]">
                {messages.length} messages
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-5xl mb-4">
                  {connected ? "\uD83D\uDC4B" : "\uD83D\uDD34"}
                </div>
                <p className="text-sm text-[var(--fg-secondary)]">
                  {connected ? "No messages yet. Say hello!" : "Waiting for connection..."}
                </p>
                {connected && (
                  <p className="text-xs text-[var(--fg-muted)] mt-1">
                    Be the first to start a conversation in this room
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={msg._id || i}
                content={msg.content}
                senderId={msg.senderId}
                createdAt={msg.createdAt}
                isSelf={msg.senderId === senderId}
              />
            ))}

            {activeTyping.length > 0 && (
              <div className="typing-indicator animate-fade-in">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
                <span>{activeTyping.map((t) => t.userId).join(", ")} typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[var(--border-subtle)] shrink-0">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={connected ? `Message #${activeRoom}` : "Connect to chat service..."}
                disabled={!connected}
                className="input-glass flex-1"
              />
              <button
                onClick={sendMessage}
                disabled={!connected || !input.trim()}
                className="btn-primary px-5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
