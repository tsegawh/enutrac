import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import routes
import dashboardRoutes from './routes/dashboard';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import subscriptionRoutes from './routes/subscription';
import deviceRoutes from './routes/device';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
//import reportsRouter from './routes/reports';
import invoiceRoutes from './routes/invoice';




// Import middleware
import { errorHandler } from './middleware/errorHandler';

// Import services
import { initializeSocket } from './services/socket';
import { startCronJobs } from './services/cron';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/user', userRoutes);
app.use('/user/orders', invoiceRoutes);

app.use('/api/admin', adminRoutes);
//app.use('/api/reports', reportsRouter);
// Error handling middleware
app.use(errorHandler);

// Initialize Socket.IO for real-time updates
initializeSocket(io);

// Start background jobs
startCronJobs();

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server initialized`);
  console.log(`⏰ Background jobs started`);
});