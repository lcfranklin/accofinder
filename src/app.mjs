import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import sessionConfig from './config/session.mjs';
import passport from './config/passport/index.mjs';

import connectDB from './config/db.mjs';

import userRoutes from './routes/userRoutes.mjs';
import notificationRoutes from './routes/notificationRoutes.mjs';
import disputeRoutes from './routes/disputeRoutes.mjs';
import paymentRoutes from './routes/paymentRoutes.mjs';
import authRoutes from './routes/authRoutes.mjs';
import houseBookingRoutes from './routes/houseBookingRoutes.mjs';
import houseListingRoutes from './routes/houseListingRoutes.mjs';
import { notFound, errorHandler } from './middleware/errorMiddleware.mjs';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ 
    origin: true,  
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/house-listing', houseListingRoutes);
app.use('/api/house-booking', houseBookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
export { connectDB };