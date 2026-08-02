import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  createLogger, requestId, requestLogger, healthCheckMiddleware,
  livenessProbe, readinessProbe, gracefulShutdown, errorHandler,
  notFound, localRateLimiter, corsOptions, validateBody,
} from '@saas/robustness';

const app = express();
const PORT = Number(process.env.VECTOR_PORT) || 4006;
const logger = createLogger('vector-service');

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestId());
app.use(requestLogger(logger));
app.use(localRateLimiter({ maxRequests: 50 }));

interface Doc { id: string; text: string; embedding: number[]; metadata?: Record<string, string>; }
const vectorStore: Doc[] = [];

function simpleEmbed(text: string, dims = 384): number[] {
  const emb = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) emb[i % dims]! = (emb[i % dims]! + text.charCodeAt(i) / 256) % 1;
  const magnitude = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
  return magnitude > 0 ? emb.map((v) => v / magnitude) : emb;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const mA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const mB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (mA * mB) || 0;
}

const embedSchema = z.object({ text: z.string().min(1), id: z.string().optional(), metadata: z.record(z.string()).optional() });
const searchSchema = z.object({ query: z.string().min(1), topK: z.number().min(1).max(50).default(5) });
const toolCallSchema = z.object({ prompt: z.string().min(1) });

app.post('/vectors/embed', validateBody(embedSchema), (req, res) => {
  const { text, id, metadata } = req.body as z.infer<typeof embedSchema>;
  const doc: Doc = { id: id || `doc-${nanoid(10)}`, text, embedding: simpleEmbed(text), metadata };
  vectorStore.push(doc);
  logger.info('Document embedded', { id: doc.id, length: text.length });
  res.status(201).json({ success: true, data: { id: doc.id, text: text.slice(0, 100), dimensions: doc.embedding.length } });
});

app.post('/vectors/search', validateBody(searchSchema), (req, res) => {
  const { query, topK } = req.body as z.infer<typeof searchSchema>;
  const queryEmbedding = simpleEmbed(query);
  const results = vectorStore
    .map((d) => ({ id: d.id, text: d.text, score: cosineSimilarity(queryEmbedding, d.embedding), metadata: d.metadata }))
    .sort((a, b) => b.score - a.score).slice(0, topK);
  logger.info('Search executed', { query: query.slice(0, 50), results: results.length });
  res.json({ success: true, data: results });
});

app.post('/vectors/tool-call', validateBody(toolCallSchema), (req, res) => {
  const { prompt } = req.body as z.infer<typeof toolCallSchema>;
  const tools = ['get_current_time', 'search_docs', 'send_notification'];
  const chosen = tools[Math.floor(Math.random() * tools.length)]!;
  let toolResult: unknown;
  if (chosen === 'get_current_time') {
    toolResult = { time: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  } else if (chosen === 'search_docs') {
    toolResult = { query: prompt.slice(0, 100), results: vectorStore.slice(0, 3).map((d) => ({ id: d.id, text: d.text.slice(0, 200) })) };
  } else {
    toolResult = { success: true, message: 'Notification would be sent' };
  }
  logger.info('Tool called', { tool: chosen, prompt: prompt.slice(0, 60) });
  res.json({ success: true, data: { content: `Used ${chosen} tool.`, toolCalls: [{ name: chosen, result: toolResult }] } });
});

app.get('/health', healthCheckMiddleware());
app.get('/live', livenessProbe());
app.get('/ready', readinessProbe());
app.get('/admin/status', (_req, res) => res.json({
  success: true, data: {
    documents: vectorStore.length, totalChars: vectorStore.reduce((s, d) => s + d.text.length, 0),
    avgDimensions: vectorStore.length > 0 ? vectorStore[0]!.embedding.length : 0,
  },
}));
app.use(notFound());
app.use(errorHandler(logger));

const server = app.listen(PORT, () => logger.info(`Vector service running on port ${PORT}`));
gracefulShutdown(server);
