import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.mjs';
import { initSocket } from './sockets/socketHandler.mjs';

import userRoutes from './routes/userRoutes.mjs';
import houseRoutes from './routes/houseRoutes.mjs';
import notificationRoutes from './routes/notificationRoutes.mjs';
import disputeRoutes from './routes/disputeRoutes.mjs';
import paymentRoutes from './routes/paymentRoutes.mjs';
import authRoutes from './routes/authRoutes.mjs';
import { notFound, errorHandler } from './middleware/errorMiddleware.mjs';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
const server = createServer(app);

initSocket(server);

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.MODE_ENV || 'development'} mode on port: ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
