"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const VECTOR_URL = process.env.NEXT_PUBLIC_VECTOR_URL || "http://localhost:4006";

export default function VectorPage() {
  const { data: session, status } = useSession();
  const [embedText, setEmbedText] = useState("");
  const [embedResult, setEmbedResult] = useState<string | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; text: string; score: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toolPrompt, setToolPrompt] = useState("");
  const [toolResult, setToolResult] = useState<{ content: string; toolCalls: { name: string; result: unknown }[] } | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"embed" | "search" | "tool">("embed");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="glass p-10 text-center">
          <div className="text-5xl mb-4">&#x1F9E0;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to use Vector DB</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Embed text, search semantically, and use AI tool calling.</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  async function handleEmbed() {
    if (!embedText) return;
    setEmbedLoading(true);
    try {
      const res = await fetch(`${VECTOR_URL}/vectors/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: embedText, id: `doc-${Date.now()}` }),
      });
      const data = await res.json();
      if (data.success) {
        setEmbedResult(`Embedded: "${data.data.text}" with 1536-dim vector.`);
        setEmbedText("");
      }
    } catch {
      setEmbedResult("Vector service not running. Start it with: pnpm run dev --filter=@saas/vector-service");
    }
    setEmbedLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`${VECTOR_URL}/vectors/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, topK: 5 }),
      });
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch {}
    setSearchLoading(false);
  }

  async function handleToolCall() {
    if (!toolPrompt) return;
    setToolLoading(true);
    try {
      const res = await fetch(`${VECTOR_URL}/vectors/tool-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: toolPrompt }),
      });
      const data = await res.json();
      if (data.success) setToolResult(data.data);
    } catch {}
    setToolLoading(false);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="page-title">Vector DB & AI</h1>
        <p className="page-subtitle">OpenAI embeddings, semantic search, and LLM tool calling agent</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: "embed" as const, label: "Embed", icon: "\uD83E\uDDE9" },
          { id: "search" as const, label: "Search", icon: "\uD83D\uDD0D" },
          { id: "tool" as const, label: "Tool Calling", icon: "\uD83E\uDD16" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                : "glass hover:border-brand-500/40 text-[var(--fg-secondary)]"
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embed */}
        {activeTab === "embed" && (
          <div className="lg:col-span-2">
            <div className="glass p-8 animate-fade-in">
              <h3 className="text-lg font-bold mb-2">Text Embedding</h3>
              <p className="text-sm text-[var(--fg-secondary)] mb-6">
                Convert text into vector embeddings using OpenAI&rsquo;s text-embedding-3-small model (1536 dimensions).
                Stored vectors can be used for semantic search.
              </p>
              <textarea
                className="input-glass min-h-[120px]"
                placeholder="Enter text to embed... e.g., 'PulseSaaS is a production-ready platform with notifications, chat, and payments.'"
                value={embedText}
                onChange={(e) => setEmbedText(e.target.value)}
              />
              <button onClick={handleEmbed} disabled={embedLoading || !embedText} className="btn-primary mt-4">
                {embedLoading ? "Embedding..." : "Generate Embedding"}
              </button>
              {embedResult && (
                <div className="mt-4 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-sm text-[var(--fg-secondary)] animate-fade-in">
                  {embedResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        {activeTab === "search" && (
          <>
            <div className="glass p-8 animate-fade-in">
              <h3 className="text-lg font-bold mb-2">Semantic Search</h3>
              <p className="text-sm text-[var(--fg-secondary)] mb-4">
                Search the vector store using meaning, not keywords.
              </p>
              <div className="flex gap-3">
                <input
                  className="input-glass flex-1"
                  placeholder='Search query... e.g., "platform features"'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <button onClick={handleSearch} disabled={searchLoading || !searchQuery} className="btn-primary">
                  {searchLoading ? "..." : "Search"}
                </button>
              </div>
            </div>
            <div className="glass p-6 animate-in">
              <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
                Results
              </h3>
              {searchResults.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">No results yet. Embed some text first, then search.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-surface-mid/50 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{r.text}</p>
                        <p className="text-[10px] text-[var(--fg-muted)] font-mono">{r.id}</p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          r.score > 0.8
                            ? "bg-emerald-500/10 text-emerald-400"
                            : r.score > 0.5
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-slate-500/10 text-[var(--fg-muted)]"
                        }`}
                      >
                        {(r.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tool Calling */}
        {activeTab === "tool" && (
          <>
            <div className="glass p-8 animate-fade-in">
              <h3 className="text-lg font-bold mb-2">AI Tool Calling</h3>
              <p className="text-sm text-[var(--fg-secondary)] mb-4">
                GPT-4 Turbo with function calling. Prompt the AI and it will automatically choose
                the right tool: get time, search docs, or send notifications.
              </p>
              <div className="glass p-4 mb-4 rounded-xl bg-surface-mid/50">
                <h4 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-2">
                  Available Tools
                </h4>
                <div className="flex flex-wrap gap-2">
                  {["get_current_time", "search_docs", "send_notification"].map((t) => (
                    <span key={t} className="badge badge-info text-[10px] py-1">{t}</span>
                  ))}
                </div>
              </div>
              <textarea
                className="input-glass min-h-[100px]"
                placeholder='Prompt... e.g., "What time is it? And search our docs for payment info. Then notify the team."'
                value={toolPrompt}
                onChange={(e) => setToolPrompt(e.target.value)}
              />
              <button onClick={handleToolCall} disabled={toolLoading || !toolPrompt} className="btn-primary mt-4">
                {toolLoading ? "Thinking..." : "Execute"}
              </button>
            </div>
            <div className="glass p-6 animate-in">
              <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
                Response
              </h3>
              {!toolResult ? (
                <p className="text-sm text-[var(--fg-muted)]">Run a prompt to see AI tool calling in action.</p>
              ) : (
                <div className="space-y-4">
                  {toolResult.content && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase text-[var(--fg-muted)] mb-1">AI Response</h4>
                      <p className="text-sm">{toolResult.content}</p>
                    </div>
                  )}
                  {toolResult.toolCalls.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase text-[var(--fg-muted)] mb-2">Tool Calls</h4>
                      {toolResult.toolCalls.map((tc, i) => (
                        <div key={i} className="p-3 rounded-xl bg-surface-mid/50 mb-2">
                          <span className="badge badge-info text-[10px] mb-1">{tc.name}</span>
                          <pre className="text-[10px] font-mono text-[var(--fg-secondary)] mt-1 overflow-x-auto">
                            {JSON.stringify(tc.result, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
