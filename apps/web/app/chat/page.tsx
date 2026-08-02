"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "@/components/MessageBubble";

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

const defaultRooms = [
  { id: "general", name: "General" },
  { id: "support", name: "Support" },
  { id: "random", name: "Random" },
];

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [activeRoom, setActiveRoom] = useState("general");
  const [rooms] = useState(defaultRooms);
  const [showRoomCreator, setShowRoomCreator] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("local_chat_" + activeRoom);
      if (saved) setMessages(JSON.parse(saved));
      else setMessages([]);
    } catch {
      setMessages([]);
    }
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function persist(items: ChatMessage[]) {
    setMessages(items);
    localStorage.setItem("local_chat_" + activeRoom, JSON.stringify(items));
  }

  function switchRoom(roomId: string) {
    setActiveRoom(roomId);
  }

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div></div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="glass p-10 text-center">
          <div className="text-5xl mb-4">&#x1F4AC;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to chat</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Join real-time conversations. (local mode)</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  const senderId = session?.user?.email || "anonymous";

  function sendMessage() {
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      roomId: activeRoom,
      senderId,
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([...messages, msg]);
    setInput("");
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button className="lg:hidden btn-secondary text-xs" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
          {mobileSidebarOpen ? "Close" : "Rooms"}
        </button>
        <span className="glow-dot glow-dot-active" />
        <span className="text-xs text-[var(--fg-muted)]">Local mode — messages stored in your browser</span>
      </div>

      <div className="flex gap-0 h-[70vh] rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
        {/* Rooms sidebar */}
        <div className={`${mobileSidebarOpen ? "absolute z-20 inset-0" : "hidden lg:flex"} lg:relative flex flex-col w-full lg:w-60 bg-surface-low border-r border-[var(--border-subtle)] shrink-0`}>
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-[var(--fg-muted)]">Rooms</h3>
              <button onClick={() => setShowRoomCreator(!showRoomCreator)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-mid">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.map((room) => (
              <button key={room.id} onClick={() => { switchRoom(room.id); setMobileSidebarOpen(false); }}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  activeRoom === room.id ? "bg-brand-600/20 border border-brand-500/30" : "hover:bg-surface-mid border border-transparent"
                }`}>
                <span className="font-semibold text-sm"># {room.name}</span>
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-xs text-[var(--fg-secondary)]">
              <span className="glow-dot glow-dot-active" />
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-bold text-sm">{rooms.find((r) => r.id === activeRoom)?.name || activeRoom}</h2>
              <p className="text-[10px] text-[var(--fg-muted)]">{messages.length} messages</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-5xl mb-4">&#x1F44B;</div>
                <p className="text-sm text-[var(--fg-secondary)]">No messages yet</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">Be the first to say hello!</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} content={msg.content} senderId={msg.senderId} createdAt={msg.createdAt} isSelf={msg.senderId === senderId} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-[var(--border-subtle)] shrink-0">
            <div className="flex gap-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={`Message #${activeRoom}`} className="input-glass flex-1" />
              <button onClick={sendMessage} disabled={!input.trim()} className="btn-primary px-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
