interface MessageBubbleProps {
  content: string;
  senderId: string;
  createdAt?: string;
  isSelf: boolean;
}

export function MessageBubble({ content, senderId, createdAt, isSelf }: MessageBubbleProps) {
  const initials = (senderId || "A")[0]?.toUpperCase() || "?";

  return (
    <div
      className={`flex items-start gap-3 animate-in ${isSelf ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          isSelf
            ? "bg-gradient-to-br from-brand-500 to-accent-purple text-white"
            : "bg-surface-high text-fg-secondary border border-[var(--border-strong)]"
        }`}
      >
        {initials}
      </div>
      <div className={`max-w-[70%] ${isSelf ? "items-end" : "items-start"}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${isSelf ? "justify-end" : ""}`}>
          <span className="font-semibold text-xs text-[var(--fg-secondary)]">
            {isSelf ? "You" : senderId}
          </span>
          {createdAt && (
            <span className="text-[10px] text-[var(--fg-muted)]">
              {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div
          className={`p-3 rounded-2xl text-sm ${
            isSelf
              ? "bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-br-md"
              : "glass rounded-bl-md"
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
