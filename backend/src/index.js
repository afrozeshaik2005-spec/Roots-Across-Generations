import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'socket.io';

import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { initBirthdayReminderJob } from './services/birthdayReminder.job.js';

dotenv.config();
import passport from './config/passport.js';

const app = express();

app.set('trust proxy', 1);

app.use(passport.initialize());
const server = http.createServer(app);

// CORS origin whitelist — used by both Express CORS and Socket.io
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173'];

// Initialize Socket.io Server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach socket server to express app so it can be accessed in controllers/services
app.set('io', io);

// Initialize Daily Birthday & Anniversary sweep scheduler
initBirthdayReminderJob(app);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Register join event for real-time messaging
  socket.on('join_chat_room', (memberId) => {
    socket.join(`member_${memberId}`);
    console.log(`Client ${socket.id} joined member_${memberId} chat room`);
  });

  // Relay typing indicators
  socket.on('typing_start', (data) => {
    socket.to(`member_${data.receiverId}`).emit('typing_indicator', {
      conversationId: data.conversationId,
      senderId: data.senderId,
      typing: true
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(`member_${data.receiverId}`).emit('typing_indicator', {
      conversationId: data.conversationId,
      senderId: data.senderId,
      typing: false
    });
  });

  // Register join event for family-wide notifications
  socket.on('join_family_room', (familyId) => {
    socket.join(`family_${familyId}`);
    console.log(`Client ${socket.id} joined family_${familyId} room`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(cookieParser());

// Static file serving fallback
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));

// Health check (root)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Health check (API prefix — used by Render)
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Base Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Roots Across Generations API Service'
  });
});

// API Routes prefixing
app.use('/api/v1', apiRoutes);

// Catch 404
app.use((req, res, next) => {
  const error = new Error('Resource not found');
  error.status = 404;
  next(error);
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Roots Across Generations Server running on port ${PORT}`);
});
export { app, server, io };
