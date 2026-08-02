import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.CHAT_PORT || 4003;
const MONGO_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/saas';

const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

let mongo: MongoClient;
let rooms: ReturnType<MongoClient['db']>['collection'];
let messages: ReturnType<MongoClient['db']>['collection'];

async function connectDB() {
  mongo = new MongoClient(MONGO_URL);
  await mongo.connect();
  const db = mongo.db('saas');
  rooms = db.collection('rooms');
  messages = db.collection('messages');
  console.log('Connected to MongoDB');
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { roomId, userId: socket.id });
  });

  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', { roomId, userId: socket.id });
  });

  socket.on('send-message', async (data: { roomId: string; senderId: string; content: string; type?: string }) => {
    const message = {
      roomId: data.roomId,
      senderId: data.senderId,
      content: data.content,
      type: data.type || 'text',
      createdAt: new Date(),
    };

    await messages.insertOne(message);
    await rooms.updateOne(
      { _id: new ObjectId(data.roomId) },
      { $set: { lastMessage: data.content, updatedAt: new Date() } }
    );

    io.to(data.roomId).emit('new-message', message);
  });

  socket.on('typing', (data: { roomId: string; userId: string }) => {
    socket.to(data.roomId).emit('user-typing', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// REST endpoints
app.post('/rooms', async (req, res) => {
  const { name, participants } = req.body;
  const room = await rooms.insertOne({
    name,
    participants,
    lastMessage: '',
    updatedAt: new Date(),
  });
  res.status(201).json({ success: true, data: { id: room.insertedId, name, participants } });
});

app.get('/rooms/:roomId/messages', async (req, res) => {
  const msgs = await messages
    .find({ roomId: req.params.roomId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  res.json({ success: true, data: msgs.reverse() });
});

app.get('/rooms', async (req, res) => {
  const allRooms = await rooms.find().sort({ updatedAt: -1 }).toArray();
  res.json({ success: true, data: allRooms });
});

async function start() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Chat service running on http://localhost:${PORT}`);
  });
}

start();
