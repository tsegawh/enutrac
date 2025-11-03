import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import passport from 'passport';
import path from 'path';

// Middleware
import { globalLimiter, loginLimiter} from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

// Routes
import dashboardRoutes from './routes/dashboard';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import subscriptionRoutes from './routes/subscription';
import deviceRoutes from './routes/device';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import invoiceRoutes from './routes/invoice';

// Services
import { initializeSocket } from './services/socket';
import { startCronJobs } from './services/cron';

// Cron jobs
import './cron/expirePendingPayments';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const TRACCAR_URL = process.env.TRACCAR_URL || "http://localhost:8082";
const TRACCAR_WS = TRACCAR_URL.replace(/^http/, "ws");


// ----------------- Determine frontend origin -----------------
const FRONTEND_ORIGIN =
  process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || `http://localhost:${PORT}` // Vite build served by backend
    : 'http://localhost:5173'; // Dev server

// ----------------- Middleware -----------------
app.use(
  helmet({
     contentSecurityPolicy: process.env.NODE_ENV === 'production'
      ? {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "https://js.stripe.com"],
            "connect-src": [
              "'self'",
              "https://api.stripe.com",
              "https://js.stripe.com",
              FRONTEND_ORIGIN,
              TRACCAR_URL,
              TRACCAR_WS
            ],
            "img-src": ["'self'", "data:","'self'",
          'data:',
          'https://a.tile.openstreetmap.org',
          'https://b.tile.openstreetmap.org',
          'https://c.tile.openstreetmap.org'],
            "style-src": ["'self'", "'unsafe-inline'",'https://fonts.googleapis.com',
          'https://unpkg.com'],
            "frame-src": ["'self'", "https://js.stripe.com"],
            fontSrc: [
          "'self'",
          'https://fonts.gstatic.com'
        ],
          },
        }
      : false, // disable CSP in dev
   })
);

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

// Webhook route with raw body
app.use('/api/payment/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON & URL-encoded parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiters
app.use(globalLimiter);

// Passport
app.use(passport.initialize());

// ----------------- Health check -----------------
app.get('/health', (_, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ----------------- API Routes -----------------
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', loginLimiter, authRoutes); // apply login limiter
app.use('/api/payment', paymentRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/user', userRoutes);
app.use('/user/orders', invoiceRoutes);
app.use('/api/admin', adminRoutes);

// ----------------- Serve Vite frontend (dist) -----------------
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'frontend_dist'); // Make sure frontend dist folder is copied here
  app.use(express.static(buildPath));

  app.get('*', (_, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ----------------- Error handler -----------------
app.use(errorHandler);

// ----------------- Socket.IO -----------------
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  },
});
initializeSocket(io);

// ----------------- Cron jobs -----------------
startCronJobs();

// ----------------- Start server -----------------
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server initialized`);
  console.log(`⏰ Background jobs started`);
});
