import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';

// ── Structured Logger ──
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts?: string;
  level: LogLevel;
  msg: string;
  reqId?: string;
  service?: string;
  [key: string]: unknown;
}

export function createLogger(service: string) {
  return {
    debug(msg: string, meta?: Record<string, unknown>) { log({ level: 'debug', msg, service, ...meta }); },
    info(msg: string, meta?: Record<string, unknown>) { log({ level: 'info', msg, service, ...meta }); },
    warn(msg: string, meta?: Record<string, unknown>) { log({ level: 'warn', msg, service, ...meta }); },
    error(msg: string, meta?: Record<string, unknown>) { log({ level: 'error', msg, service, ...meta }); },
  };
}

function log(entry: LogEntry) {
  entry.ts = new Date().toISOString();
  const { level, msg, ...rest } = entry;
  const line = JSON.stringify({ level, msg, ...rest });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

// ── Request ID Middleware ──
export function requestId() {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).requestId = req.headers['x-request-id'] || uuidv4();
    next();
  };
}

// ── Request Logger Middleware ──
export function requestLogger(logger: ReturnType<typeof createLogger>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info(`${req.method} ${req.path}`, {
        reqId: (req as any).requestId,
        status: res.statusCode,
        duration_ms: Date.now() - start,
        ip: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 100),
      });
    });
    next();
  };
}

// ── Circuit Breaker ──
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private halfOpenTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private name: string,
    private options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      halfOpenMaxRequests?: number;
    } = {}
  ) {}

  private get failureThreshold() { return this.options.failureThreshold ?? 5; }
  private get resetTimeoutMs() { return this.options.resetTimeoutMs ?? 30000; }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new CircuitBreakerOpenError(this.name);
      }
    }

    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
        console.warn(`[CircuitBreaker] ${this.name} opened after ${this.failures} failures`);
      }
      throw err;
    }
  }

  getStatus() {
    return { name: this.name, state: this.state, failures: this.failures };
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" is open`);
  }
}

// ── Retry with Backoff ──
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 10000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 500, maxDelay);
      options.onRetry?.(attempt + 1, err as Error);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// ── Timeout ──
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)),
  ]);
}

// ── Health Check Registry ──
interface HealthCheck {
  name: string;
  check: () => Promise<{ status: 'ok' | 'degraded' | 'down'; detail?: string }>;
}

const healthChecks: HealthCheck[] = [];

export function registerHealthCheck(name: string, check: () => Promise<{ status: 'ok' | 'degraded' | 'down'; detail?: string }>) {
  healthChecks.push({ name, check });
}

export async function runHealthChecks(): Promise<{
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, { status: string; detail?: string }>;
  uptime: number;
}> {
  const checks: Record<string, { status: string; detail?: string }> = {};
  let overall: 'ok' | 'degraded' | 'down' = 'ok';

  for (const hc of healthChecks) {
    try {
      const result = await withTimeout(hc.check(), 5000);
      checks[hc.name] = result;
      if (result.status === 'down' && overall !== 'down') overall = 'degraded';
      if (result.status === 'down') overall = 'down';
    } catch {
      checks[hc.name] = { status: 'down', detail: 'Health check failed' };
      overall = 'degraded';
    }
  }

  return { status: overall, checks, uptime: process.uptime() };
}

export function healthCheckMiddleware() {
  return async (_req: Request, res: Response) => {
    const result = await runHealthChecks();
    res.status(result.status === 'down' ? 503 : result.status === 'degraded' ? 200 : 200).json(result);
  };
}

// ── Liveness / Readiness ──
export function livenessProbe() {
  return (_req: Request, res: Response) => res.status(200).json({ status: 'alive', uptime: process.uptime() });
}

export function readinessProbe() {
  return async (_req: Request, res: Response) => {
    const result = await runHealthChecks();
    res.status(result.status === 'down' ? 503 : 200).json(result);
  };
}

// ── Graceful Shutdown ──
export function gracefulShutdown(server: { close: (cb?: () => void) => void }, options: { timeoutMs?: number } = {}) {
  const timeout = options.timeoutMs ?? 30000;

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, timeout);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), timeout);
  });
}

// ── Error Handler Middleware ──
export function errorHandler(logger: ReturnType<typeof createLogger>) {
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      reqId: (req as any).requestId,
      error: err.message,
      stack: err.stack?.slice(0, 500),
      path: req.path,
    });

    if (err instanceof CircuitBreakerOpenError) {
      return res.status(503).json({ success: false, error: 'Service temporarily unavailable', retryAfter: 30 });
    }

    res.status(500).json({ success: false, error: 'Internal server error', requestId: (req as any).requestId });
  };
}

// ── Not Found Middleware ──
export function notFound() {
  return (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
  };
}

// ── Validation Middleware ──
import type { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    next();
  };
}

// ── Rate Limit Middleware (in-memory) ──
export function localRateLimiter(options: { windowMs?: number; maxRequests?: number } = {}) {
  const windowMs = options.windowMs ?? 60000;
  const maxRequests = options.maxRequests ?? 100;
  const store = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }

    next();
  };
}

// ── CORS Preset ──
export const corsOptions = {
  origin: process.env.WEB_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-ID'],
  maxAge: 86400,
};

// ── DB Health Check Helper ──
export async function dbHealthCheck(name: string, ping: () => Promise<boolean>): Promise<{ status: 'ok' | 'degraded' | 'down'; detail?: string }> {
  try {
    const ok = await withTimeout(ping(), 3000);
    return ok ? { status: 'ok' } : { status: 'degraded', detail: `${name} ping returned false` };
  } catch (err) {
    return { status: 'down', detail: `${name} unreachable: ${(err as Error).message}` };
  }
}

// ── Prometheus Metrics ──
interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels: Record<string, string>;
  value: number;
}

class MetricsRegistry {
  private metrics: Map<string, Metric> = new Map();

  counter(name: string, help: string, labels: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const existing = this.metrics.get(key);
    if (existing) { existing.value += 1; return; }
    this.metrics.set(key, { name, help, type: 'counter', labels, value: 1 });
  }

  gauge(name: string, value: number, help: string, labels: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.metrics.set(key, { name, help, type: 'gauge', labels, value });
  }

  incCounter(name: string) { this.counter(name, ''); }

  export(): string {
    const lines: string[] = [];
    const grouped = new Map<string, Metric[]>();

    for (const [, m] of this.metrics) {
      if (!grouped.has(m.name)) grouped.set(m.name, []);
      grouped.get(m.name)!.push(m);
    }

    for (const [name, metrics] of grouped) {
      const help = metrics[0]!.help;
      const type = metrics[0]!.type;
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
      for (const m of metrics) {
        const labelStr = Object.entries(m.labels).map(([k, v]) => `${k}="${v}"`).join(',');
        lines.push(labelStr ? `${name}{${labelStr}} ${m.value}` : `${name} ${m.value}`);
      }
    }
    return lines.join('\n') + '\n';
  }
}

const globalMetrics = new MetricsRegistry();

export function getMetrics() { return globalMetrics; }

export function metricsMiddleware() {
  return (req: Request, _res: Response, next: NextFunction) => {
    globalMetrics.incCounter('http_requests_total');
    next();
  };
}

export function metricsEndpoint() {
  return (_req: Request, res: Response) => {
    globalMetrics.gauge('process_uptime_seconds', process.uptime(), 'Process uptime in seconds');
    globalMetrics.gauge('process_memory_bytes', process.memoryUsage().rss, 'Process memory RSS in bytes');
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(globalMetrics.export());
  };
}

// ── API Versioning Middleware ──
export function apiVersion(prefix: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).apiVersion = prefix;
    next();
  };
}

// ── Webhook System ──
interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

const webhooks: WebhookSubscription[] = [];

export function registerWebhook(sub: Omit<WebhookSubscription, 'id' | 'createdAt'>): WebhookSubscription {
  const s: WebhookSubscription = { ...sub, id: uuidv4(), createdAt: new Date().toISOString() };
  webhooks.push(s);
  return s;
}

export async function fireWebhook(event: string, payload: unknown): Promise<void> {
  const matches = webhooks.filter((w) => w.active && w.events.includes(event));
  if (matches.length === 0) return;

  const results = await Promise.allSettled(
    matches.map(async (w) => {
      try {
        await fetch(w.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': w.secret },
          body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.warn(`Webhook ${w.id} failed: ${(err as Error).message}`);
      }
    })
  );
}

export function webhookEndpoints() {
  const router = express.Router();
  router.post('/subscribe', (req, res) => {
    const { url, events, secret } = req.body;
    if (!url || !events) return res.status(400).json({ success: false, error: 'url and events required' });
    const sub = registerWebhook({ url, events, secret: secret || uuidv4(), active: true });
    res.status(201).json({ success: true, data: { id: sub.id, secret: sub.secret } });
  });
  router.get('/list', (_req, res) => {
    res.json({ success: true, data: webhooks.map((w) => ({ id: w.id, url: w.url, events: w.events, active: w.active, createdAt: w.createdAt })) });
  });
  router.delete('/:id', (req, res) => {
    const idx = webhooks.findIndex((w) => w.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
    webhooks.splice(idx, 1);
    res.json({ success: true, data: null });
  });
  return router;
}
