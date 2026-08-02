"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Doc { id: string; text: string; embedding?: number[] }

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const mA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const mB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (mA * mB) || 0;
}

function simpleHash(str: string): number[] {
  const h = new Array(128).fill(0);
  for (let i = 0; i < str.length; i++) {
    h[i % 128]! = ((h[i % 128]! + str.charCodeAt(i)) / 256);
  }
  return h;
}

export default function VectorPage() {
  const { data: session, status } = useSession();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [embedText, setEmbedText] = useState("");
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedResult, setEmbedResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; text: string; score: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [toolPrompt, setToolPrompt] = useState("");
  const [toolResult, setToolResult] = useState<string | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"embed" | "search" | "tool">("embed");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("local_vector_docs");
      if (saved) setDocs(JSON.parse(saved));
    } catch {}
  }, []);

  function persist(items: Doc[]) {
    setDocs(items);
    localStorage.setItem("local_vector_docs", JSON.stringify(items));
  }

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div></div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="glass p-10 text-center">
          <div className="text-5xl mb-4">&#x1F9E0;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to use Vector DB</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Semantic search and AI tool calling.</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  function handleEmbed() {
    if (!embedText) return;
    setEmbedLoading(true);
    const doc: Doc = {
      id: `doc-${Date.now()}`,
      text: embedText,
      embedding: simpleHash(embedText),
    };
    persist([...docs, doc]);
    setEmbedResult(`Embedded: "${doc.text.slice(0, 60)}..." with simple hash (local mode)`);
    setEmbedText("");
    setEmbedLoading(false);
    setTimeout(() => setEmbedResult(null), 4000);
  }

  function handleSearch() {
    if (!searchQuery || docs.length === 0) return;
    setSearchLoading(true);
    const queryVector = simpleHash(searchQuery);
    const results = docs
      .map((d) => ({ id: d.id, text: d.text, score: d.embedding ? cosineSimilarity(queryVector, d.embedding) : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    setSearchResults(results);
    setSearchLoading(false);
  }

  function handleToolCall() {
    if (!toolPrompt) return;
    setToolLoading(true);
    setTimeout(() => {
      const mockTools = ["search_docs", "get_current_time"];
      const toolName = mockTools[Math.floor(Math.random() * mockTools.length)]!;
      const result = toolName === "get_current_time"
        ? `Current time: ${new Date().toISOString()}`
        : `Found ${docs.length} documents in the vector store`;
      setToolResult(`AI Response: I used the "${toolName}" tool. Result: ${result}`);
      setToolLoading(false);
    }, 1000);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="page-title">Vector DB & AI</h1>
        <p className="page-subtitle">Semantic search and tool calling (local simulation mode)</p>
      </div>

      <div className="flex gap-2">
        {[
          { id: "embed" as const, label: "Embed", icon: "\uD83E\uDDE9" },
          { id: "search" as const, label: "Search", icon: "\uD83D\uDD0D" },
          { id: "tool" as const, label: "Tool Calling", icon: "\uD83E\uDD16" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? "bg-brand-600 text-white" : "glass hover:border-brand-500/40"
            }`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeTab === "embed" && (
          <div className="lg:col-span-2">
            <div className="glass p-6">
              <h3 className="font-bold mb-2">Text Embedding</h3>
              <p className="text-sm text-[var(--fg-secondary)] mb-4">Hash-based vector simulation (add OPENAI_API_KEY for real embeddings)</p>
              <textarea className="input-glass min-h-[100px]" placeholder="Enter text to embed..." value={embedText} onChange={(e) => setEmbedText(e.target.value)} />
              <button onClick={handleEmbed} disabled={embedLoading || !embedText} className="btn-primary mt-3 text-sm">
                {embedLoading ? "Embedding..." : "Generate Embedding"}
              </button>
              {embedResult && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-sm text-emerald-600">{embedResult}</div>
              )}
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-[var(--fg-muted)] uppercase mb-2">Stored Documents ({docs.length})</h4>
                {docs.slice(0, 5).map((d) => (
                  <div key={d.id} className="text-xs text-[var(--fg-secondary)] py-1 truncate">{d.text}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "search" && (
          <>
            <div className="glass p-6">
              <h3 className="font-bold mb-2">Semantic Search</h3>
              <p className="text-sm text-[var(--fg-secondary)] mb-4">Search using cosine similarity on hash vectors</p>
              <div className="flex gap-3">
                <input className="input-glass flex-1" placeholder='Search query...' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
                <button onClick={handleSearch} disabled={searchLoading || !searchQuery} className="btn-primary text-sm">{searchLoading ? "..." : "Search"}</button>
              </div>
            </div>
            <div className="glass p-6">
              <h3 className="text-xs font-semibold uppercase text-[var(--fg-muted)] mb-4">Results</h3>
              {searchResults.length === 0 ? (
                <p className="text-sm text-[var(--fg-muted)]">Embed some text first, then search.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-surface-mid/50 flex items-center justify-between">
                      <div className="flex-1 min-w-0"><p className="text-sm truncate">{r.text}</p></div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${r.score > 0.7 ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-[var(--fg-muted)]"}`}>
                        {(r.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "tool" && (
          <>
            <div className="glass p-6">
              <h3 className="font-bold mb-2">AI Tool Calling</h3>
              <p className="text-sm text-[var(--fg-secondary)] mb-4">Simulated LLM with function calling (add OPENAI_API_KEY for real GPT-4)</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {["get_current_time", "search_docs", "send_notification"].map((t) => (
                  <span key={t} className="badge badge-info text-[10px]">{t}</span>
                ))}
              </div>
              <textarea className="input-glass min-h-[80px]" placeholder='Prompt... e.g., "What time is it? Search our docs."' value={toolPrompt} onChange={(e) => setToolPrompt(e.target.value)} />
              <button onClick={handleToolCall} disabled={toolLoading || !toolPrompt} className="btn-primary mt-3 text-sm">{toolLoading ? "Thinking..." : "Execute"}</button>
            </div>
            <div className="glass p-6">
              <h3 className="text-xs font-semibold uppercase text-[var(--fg-muted)] mb-4">Response</h3>
              {!toolResult ? (
                <p className="text-sm text-[var(--fg-muted)]">Run a prompt to see simulated tool calling.</p>
              ) : (
                <div className="p-4 rounded-xl bg-surface-mid/50 text-sm">{toolResult}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
