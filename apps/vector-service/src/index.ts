import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.VECTOR_PORT || 4006;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder' });

// In-memory vector store (replace with Pinecone/pgvector in production)
const vectorStore: { id: string; text: string; embedding: number[] }[] = [];

app.use(cors());
app.use(express.json());

// ── Embed & Store ──
app.post('/vectors/embed', async (req, res) => {
  try {
    const { text, id } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text required' });
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      return res.status(500).json({ success: false, error: 'Failed to generate embedding' });
    }

    vectorStore.push({ id: id || String(Date.now()), text, embedding });
    res.status(201).json({ success: true, data: { id, text } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Semantic Search ──
app.post('/vectors/search', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query required' });
    }

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = response.data[0]?.embedding;
    if (!queryEmbedding) {
      return res.status(500).json({ success: false, error: 'Failed to generate embedding' });
    }

    const results = vectorStore
      .map((item) => ({
        id: item.id,
        text: item.text,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Tool Calling ──
const functionRegistry: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_current_time: async () => ({ time: new Date().toISOString() }),
  search_docs: async (args) => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: args.query as string,
    });

    const queryEmbedding = response.data[0]?.embedding;
    if (!queryEmbedding) return { results: [] };

    const results = vectorStore
      .map((item) => ({
        id: item.id,
        text: item.text,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return { results };
  },
  send_notification: async (args) => {
    return { success: true, message: `Notification sent to ${args.recipient}: ${args.message}` };
  },
};

app.post('/vectors/tool-call', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt required' });
    }

    const tools = [
      { type: 'function' as const, function: { name: 'get_current_time', description: 'Get current server time', parameters: { type: 'object' as const, properties: {} } } },
      { type: 'function' as const, function: { name: 'search_docs', description: 'Search vector store for documents', parameters: { type: 'object' as const, properties: { query: { type: 'string', description: 'The search query' } }, required: ['query'] } } },
      { type: 'function' as const, function: { name: 'send_notification', description: 'Send a notification', parameters: { type: 'object' as const, properties: { recipient: { type: 'string' }, message: { type: 'string' } }, required: ['recipient', 'message'] } } },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Use the available tools when needed to fulfill user requests.' },
        { role: 'user', content: prompt },
      ],
      tools,
      tool_choice: 'auto',
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      return res.status(500).json({ success: false, error: 'No response' });
    }

    const toolCalls = message.tool_calls || [];
    const toolResults = [];

    for (const call of toolCalls) {
      const fn = functionRegistry[call.function.name];
      if (fn) {
        const args = JSON.parse(call.function.arguments);
        const result = await fn(args);
        toolResults.push({ name: call.function.name, result });
      }
    }

    res.json({
      success: true,
      data: {
        content: message.content,
        toolCalls: toolResults,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB) || 0;
}

app.listen(PORT, () => {
  console.log(`Vector service running on http://localhost:${PORT}`);
});
