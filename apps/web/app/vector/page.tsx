"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

const VECTOR = process.env.NEXT_PUBLIC_VECTOR_URL || "http://localhost:4006";

interface Doc { id: string; text: string; }
interface SearchResult { id: string; text: string; score: number; }

export default function VectorPage() {
  const { data: session, status } = useSession();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [embedText, setEmbedText] = useState("");
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedResult, setEmbedResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toolPrompt, setToolPrompt] = useState("");
  const [toolResult, setToolResult] = useState<string | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"embed" | "search" | "tool">("embed");
  const [connected, setConnected] = useState(false);

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="glass p-10 text-center"><div className="text-5xl mb-4">🧠</div><h2 className="text-xl font-bold mb-2">Sign in</h2><p className="text-sm text-[var(--fg-secondary)] mb-6">Vector search and AI tool calling (port 4006)</p><Link href="/auth/login" className="btn-primary">Sign In</Link></div></div>;

  async function handleEmbed() {
    if (!embedText) return;
    setEmbedLoading(true);
    try {
      const r = await fetch(`${VECTOR}/vectors/embed`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: embedText }) });
      const d = await r.json();
      if (d.success) { setEmbedResult(`Embedded: "${embedText.slice(0, 60)}..." (${d.data.dimensions} dims)`); setConnected(true); setEmbedText(""); }
    } catch { setEmbedResult("Vector service not running (port 4006)"); setConnected(false); }
    setEmbedLoading(false);
    setTimeout(() => setEmbedResult(null), 4000);
  }

  async function handleSearch() {
    if (!searchQuery) return;
    setSearchLoading(true);
    try {
      const r = await fetch(`${VECTOR}/vectors/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: searchQuery, topK: 5 }) });
      const d = await r.json();
      if (d.success) { setSearchResults(d.data); setConnected(true); }
    } catch { setConnected(false); }
    setSearchLoading(false);
  }

  async function handleToolCall() {
    if (!toolPrompt) return;
    setToolLoading(true);
    try {
      const r = await fetch(`${VECTOR}/vectors/tool-call`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: toolPrompt }) });
      const d = await r.json();
      if (d.success) { setToolResult(`AI used: ${d.data.toolCalls?.[0]?.name || "unknown"}. ${d.data.content}`); setConnected(true); }
    } catch { setConnected(false); }
    setToolLoading(false);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="page-title">Vector DB & AI</h1><p className="page-subtitle">Embeddings, semantic search, tool calling (port 4006)</p></div><span className={`glass px-3 py-1 rounded-full text-xs ${connected ? "text-emerald-600" : "text-amber-600"}`}>{connected ? "◉ Connected" : "○ Offline"}</span></div>

      <div className="flex gap-2">
        {[{ id: "embed" as const, label: "Embed", icon: "🧩" }, { id: "search" as const, label: "Search", icon: "🔍" }, { id: "tool" as const, label: "Tool Calling", icon: "🤖" }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-brand-600 text-white" : "glass hover:border-brand-500/40"}`}><span>{tab.icon}</span> {tab.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeTab === "embed" && (
          <div className="lg:col-span-2"><div className="glass p-6"><h3 className="font-bold mb-2">Text Embedding</h3><p className="text-sm text-[var(--fg-secondary)] mb-4">384-dim hash-based vectors. Add OPENAI_API_KEY for real 1536-dim embeddings.</p>
            <textarea className="input-glass min-h-[100px]" placeholder="Enter text to embed..." value={embedText} onChange={(e) => setEmbedText(e.target.value)} />
            <button onClick={handleEmbed} disabled={embedLoading || !embedText} className="btn-primary mt-3 text-sm">{embedLoading ? "Embedding..." : "Generate Embedding"}</button>
            {embedResult && <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-sm text-emerald-600">{embedResult}</div>}
          </div></div>
        )}
        {activeTab === "search" && (
          <>
            <div className="glass p-6"><h3 className="font-bold mb-2">Semantic Search</h3><p className="text-sm text-[var(--fg-secondary)] mb-4">Cosine similarity on hash vectors</p><div className="flex gap-3"><input className="input-glass flex-1" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} /><button onClick={handleSearch} disabled={searchLoading || !searchQuery} className="btn-primary text-sm">{searchLoading ? "..." : "Search"}</button></div></div>
            <div className="glass p-6"><h3 className="text-xs font-semibold uppercase text-[var(--fg-muted)] mb-4">Results</h3>
              {searchResults.length === 0 ? <p className="text-sm text-[var(--fg-muted)]">Embed some text first, then search.</p> : (
                <div className="space-y-2">{searchResults.map((r) => <div key={r.id} className="p-3 rounded-xl bg-surface-mid/50 flex items-center justify-between"><div className="flex-1 min-w-0"><p className="text-sm truncate">{r.text}</p></div><span className={`text-xs font-bold px-2 py-1 rounded-lg ${r.score > 0.7 ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-[var(--fg-muted)]"}`}>{(r.score * 100).toFixed(0)}%</span></div>)}</div>
              )}
            </div>
          </>
        )}
        {activeTab === "tool" && (
          <>
            <div className="glass p-6"><h3 className="font-bold mb-2">AI Tool Calling</h3><p className="text-sm text-[var(--fg-secondary)] mb-4">Simulated LLM with auto tool selection</p><div className="flex flex-wrap gap-2 mb-4"><span className="badge badge-info text-[10px]">get_current_time</span><span className="badge badge-info text-[10px]">search_docs</span><span className="badge badge-info text-[10px]">send_notification</span></div><textarea className="input-glass min-h-[80px]" placeholder='Prompt...' value={toolPrompt} onChange={(e) => setToolPrompt(e.target.value)} /><button onClick={handleToolCall} disabled={toolLoading || !toolPrompt} className="btn-primary mt-3 text-sm">{toolLoading ? "Thinking..." : "Execute"}</button></div>
            <div className="glass p-6"><h3 className="text-xs font-semibold uppercase text-[var(--fg-muted)] mb-4">Response</h3>{!toolResult ? <p className="text-sm text-[var(--fg-muted)]">Run a prompt to see simulated tool calling.</p> : <div className="p-4 rounded-xl bg-surface-mid/50 text-sm">{toolResult}</div>}</div>
          </>
        )}
      </div>
    </div>
  );
}
