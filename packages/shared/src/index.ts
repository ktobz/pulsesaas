import { z } from 'zod';

// ── User ──
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  googleId: z.string().optional(),
  role: z.enum(['admin', 'user']).default('user'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// ── API Key ──
export const ApiKeySchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  keyHash: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  revokedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

// ── Notification ──
export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  channel: z.enum(['email', 'sms', 'push']),
  template: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.enum(['pending', 'sent', 'failed']),
  meta: z.record(z.unknown()).optional(),
  sentAt: z.date().nullable(),
  createdAt: z.date(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const SendNotificationInput = z.object({
  userId: z.string(),
  channel: z.enum(['email', 'sms', 'push']),
  template: z.string(),
  subject: z.string(),
  body: z.string(),
  meta: z.record(z.unknown()).optional(),
});

export type SendNotificationInput = z.infer<typeof SendNotificationInput>;

// ── Payment ──
export const PaymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  stripeSessionId: z.string(),
  amount: z.number(),
  currency: z.string().default('usd'),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  invoiceUrl: z.string().url().nullable(),
  createdAt: z.date(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// ── URL Shortener ──
export const UrlSchema = z.object({
  id: z.string(),
  userId: z.string(),
  originalUrl: z.string().url(),
  shortCode: z.string(),
  clicks: z.number().default(0),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

export type Url = z.infer<typeof UrlSchema>;

export const CreateUrlInput = z.object({
  originalUrl: z.string().url(),
  customCode: z.string().optional(),
  expiresInDays: z.number().positive().optional(),
});

export type CreateUrlInput = z.infer<typeof CreateUrlInput>;

// ── Chat ──
export const MessageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderId: z.string(),
  content: z.string(),
  type: z.enum(['text', 'image', 'file']).default('text'),
  createdAt: z.date(),
});

export type Message = z.infer<typeof MessageSchema>;

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  participants: z.array(z.string()),
  lastMessage: z.string().optional(),
  updatedAt: z.date(),
});

export type Room = z.infer<typeof RoomSchema>;

// ── API Response ──
export const ApiResponse = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean(),
    data: data.optional(),
    error: z.string().optional(),
    meta: z
      .object({
        page: z.number().optional(),
        limit: z.number().optional(),
        total: z.number().optional(),
      })
      .optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

// ── Rate Limit ──
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
