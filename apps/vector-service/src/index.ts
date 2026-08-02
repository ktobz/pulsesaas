import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
const PORT = process.env.VECTOR_PORT || 4006;

app.use(cors());
app.use(express.json());

interface Doc {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, string>;
}

const vectorStore: Doc[] = [];

function simpleEmbed(text: string, dims = 384): number[] {
  const emb = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) {
    emb[i % dims]! = (emb[i % dims]! + text.charCodeAt(i) / 256) % 1;
  }
  const magnitude = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
  return magnitude > 0 ? emb.map((v) => v / magnitude) : emb;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const mA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const mB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (mA * mB) || 0;
}

app.post('/vectors/embed', (req, res) => {
  const { text, id, metadata } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text required' });

  const doc: Doc = {
    id: id || `doc-${nanoid(10)}`,
    text,
    embedding: simpleEmbed(text),
    metadata,
  };
  vectorStore.push(doc);

  res.status(201).json({ success: true, data: { id: doc.id, text: doc.text.slice(0, 100), dimensions: doc.embedding.length } });
});

app.post('/vectors/search', (req, res) => {
  const { query, topK = 5 } = req.body;
  if (!query) return res.status(400).json({ success: false, error: 'query required' });

  const queryEmbedding = simpleEmbed(query);
  const results = vectorStore
    .map((d) => ({ id: d.id, text: d.text, score: cosineSimilarity(queryEmbedding, d.embedding), metadata: d.metadata }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  res.json({ success: true, data: results });
});

app.post('/vectors/tool-call', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: 'prompt required' });

  const tools = ['get_current_time', 'search_docs', 'send_notification'];
  const chosenTool = tools[Math.floor(Math.random() * tools.length)]!;

  let toolResult: unknown;
  if (chosenTool === 'get_current_time') {
    toolResult = { time: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  } else if (chosenTool === 'search_docs') {
    const results = vectorStore.slice(0, 3).map((d) => ({ id: d.id, text: d.text.slice(0, 200) }));
    toolResult = { query: prompt.slice(0, 100), results };
  } else {
    toolResult = { success: true, message: 'Notification would be sent' };
  }

  res.json({
    success: true,
    data: {
      content: `AI response to: "${prompt.slice(0, 50)}..." — used ${chosenTool} tool.`,
      toolCalls: [{ name: chosenTool, result: toolResult }],
    },
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'vector-service', documents: vectorStore.length }));

app.listen(PORT, () => console.log(`Vector service running on http://localhost:${PORT}`));
