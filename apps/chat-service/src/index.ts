import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import {
  createLogger, requestId, requestLogger, healthCheckMiddleware,
  livenessProbe, readinessProbe, gracefulShutdown, errorHandler,
  notFound, localRateLimiter, corsOptions, registerHealthCheck,
  dbHealthCheck,
} from '@saas/robustness';

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.CHAT_PORT) || 4003;
const logger = createLogger('chat-service');

const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestId());
app.use(requestLogger(logger));
app.use(localRateLimiter({ maxRequests: 300 }));

interface Room { id: string; name: string; participants: string[]; lastMessage: string; updatedAt: string; }
interface Message { id: string; roomId: string; senderId: string; content: string; type: string; createdAt: string; }
interface DM { id: string; from: string; to: string; content: string; createdAt: string; }

const rooms: Room[] = [
  { id: 'general', name: 'General', participants: [], lastMessage: '', updatedAt: new Date().toISOString() },
  { id: 'support', name: 'Support', participants: [], lastMessage: '', updatedAt: new Date().toISOString() },
  { id: 'random', name: 'Random', participants: [], lastMessage: '', updatedAt: new Date().toISOString() },
];
const messages: Message[] = [];
const dms: DM[] = [];
const onlineUsers = new Map<string, Set<string>>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

io.on('connection', (socket) => {
  logger.info('Socket connected', { socketId: socket.id });

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    if (!onlineUsers.has(roomId)) onlineUsers.set(roomId, new Set());
    onlineUsers.get(roomId)!.add(socket.id);
    socket.to(roomId).emit('user-joined', { roomId, userId: socket.id });
    io.emit('online-update', { room: roomId, count: onlineUsers.get(roomId)?.size || 0 });
  });

  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    onlineUsers.get(roomId)?.delete(socket.id);
    socket.to(roomId).emit('user-left', { roomId, userId: socket.id });
  });

  socket.on('send-message', (data: { roomId: string; senderId: string; content: string; type?: string }) => {
    const msg: Message = { id: nanoid(), roomId: data.roomId, senderId: data.senderId, content: data.content, type: data.type || 'text', createdAt: new Date().toISOString() };
    messages.push(msg);
    const room = rooms.find((r) => r.id === data.roomId);
    if (room) { room.lastMessage = data.content; room.updatedAt = new Date().toISOString(); }
    io.to(data.roomId).emit('new-message', msg);
  });

  socket.on('send-dm', (data: { from: string; to: string; content: string }) => {
    const dm: DM = { id: nanoid(), from: data.from, to: data.to, content: data.content, createdAt: new Date().toISOString() };
    dms.push(dm);
    io.emit('new-dm', dm);
  });

  socket.on('typing', (data: { roomId: string; userId: string }) => {
    socket.to(data.roomId).emit('user-typing', data);
    const key = `${data.roomId}:${data.userId}`;
    if (typingTimers.has(key)) clearTimeout(typingTimers.get(key));
    typingTimers.set(key, setTimeout(() => socket.to(data.roomId).emit('user-stopped-typing', data), 3000));
  });

  socket.on('disconnect', () => {
    onlineUsers.forEach((users, room) => { users.delete(socket.id); });
  });
});

app.post('/rooms', (req, res) => {
  const { name, participants } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const room: Room = { id: name.toLowerCase().replace(/\s+/g, '-'), name, participants: participants || [], lastMessage: '', updatedAt: new Date().toISOString() };
  if (!rooms.find((r) => r.id === room.id)) rooms.push(room);
  res.status(201).json({ success: true, data: room });
});

app.get('/rooms', (_req, res) => res.json({ success: true, data: rooms }));
app.get('/rooms/:roomId/messages', (req, res) => {
  const msgs = messages.filter((m) => m.roomId === req.params.roomId).slice(-100);
  res.json({ success: true, data: msgs });
});

app.get('/dms', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ success: false, error: 'from and to required' });
  const result = dms.filter((d) => (d.from === from && d.to === to) || (d.from === to && d.to === from));
  res.json({ success: true, data: result });
});

registerHealthCheck('rooms', async () => ({ status: rooms.length > 0 ? 'ok' : 'degraded', detail: `${rooms.length} rooms` }));

app.get('/health', healthCheckMiddleware());
app.get('/live', livenessProbe());
app.get('/ready', readinessProbe());
app.use(notFound());
app.use(errorHandler(logger));

httpServer.listen(PORT, () => logger.info(`Chat service running on port ${PORT}`));
gracefulShutdown(httpServer);
