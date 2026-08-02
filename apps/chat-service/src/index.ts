import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.CHAT_PORT || 4003;

const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

interface Room { id: string; name: string; participants: string[]; lastMessage: string; updatedAt: string; }
interface Message { id: string; roomId: string; senderId: string; content: string; type: string; createdAt: string; }
interface DirectMessage { id: string; from: string; to: string; content: string; createdAt: string; }

const rooms: Room[] = [
  { id: 'general', name: 'General', participants: [], lastMessage: '', updatedAt: new Date().toISOString() },
  { id: 'support', name: 'Support', participants: [], lastMessage: '', updatedAt: new Date().toISOString() },
  { id: 'random', name: 'Random', participants: [], lastMessage: '', updatedAt: new Date().toISOString() },
];

const messages: Message[] = [];
const dms: DirectMessage[] = [];
const onlineUsers = new Map<string, Set<string>>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

io.on('connection', (socket) => {
  console.log(`Chat: user connected ${socket.id}`);

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
    const msg: Message = {
      id: nanoid(),
      roomId: data.roomId,
      senderId: data.senderId,
      content: data.content,
      type: data.type || 'text',
      createdAt: new Date().toISOString(),
    };
    messages.push(msg);

    const room = rooms.find((r) => r.id === data.roomId);
    if (room) { room.lastMessage = data.content; room.updatedAt = new Date().toISOString(); }

    io.to(data.roomId).emit('new-message', msg);
  });

  socket.on('send-dm', (data: { from: string; to: string; content: string }) => {
    const dm: DirectMessage = {
      id: nanoid(),
      from: data.from,
      to: data.to,
      content: data.content,
      createdAt: new Date().toISOString(),
    };
    dms.push(dm);
    io.emit('new-dm', dm);
  });

  socket.on('typing', (data: { roomId: string; userId: string }) => {
    const key = `${data.roomId}:${data.userId}`;
    socket.to(data.roomId).emit('user-typing', data);
    if (typingTimers.has(key)) clearTimeout(typingTimers.get(key));
    typingTimers.set(key, setTimeout(() => {
      socket.to(data.roomId).emit('user-stopped-typing', data);
    }, 3000));
  });

  socket.on('disconnect', () => {
    onlineUsers.forEach((users, room) => {
      users.delete(socket.id);
      io.to(room).emit('user-left', { roomId: room, userId: socket.id });
    });
  });
});

// REST endpoints
app.post('/rooms', (req, res) => {
  const { name, participants } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const room: Room = { id: name.toLowerCase().replace(/\s+/g, '-'), name, participants: participants || [], lastMessage: '', updatedAt: new Date().toISOString() };
  if (!rooms.find((r) => r.id === room.id)) rooms.push(room);
  res.status(201).json({ success: true, data: room });
});

app.get('/rooms', (_req, res) => {
  res.json({ success: true, data: rooms });
});

app.get('/rooms/:roomId/messages', (req, res) => {
  const msgs = messages.filter((m) => m.roomId === req.params.roomId).slice(-100);
  res.json({ success: true, data: msgs });
});

app.get('/dms', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ success: false, error: 'from and to required' });
  const result = dms.filter((d) => (d.from === from && d.to === to) || (d.from === to && d.to === from)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json({ success: true, data: result });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'chat-service', rooms: rooms.length, messages: messages.length }));

httpServer.listen(PORT, () => console.log(`Chat service running on http://localhost:${PORT}`));
