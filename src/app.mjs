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

import uploadRoutes from './routes/uploadRoutes.mjs';
import { notFound, errorHandler } from './middleware/errorMiddleware.mjs';

import roomRoutes from './routes/roomRoutes.mjs';
import propertyRoutes from './routes/propertyRoutes.mjs';

import houseBookingRoutes from './routes/bookingRoutes.mjs';

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  }),
);
// 3. Webhook route (needs raw body) for pay changu
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentRoutes,
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AccoFinder</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                border-radius: 16px;
                padding: 48px 32px;
                text-align: center;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            
            h1 {
                font-size: 48px;
                margin-bottom: 16px;
            }
            
            .status {
                background: #10b981;
                color: white;
                padding: 8px 20px;
                border-radius: 50px;
                display: inline-block;
                font-weight: 600;
                margin: 20px 0;
            }
            
            .message {
                color: #333;
                font-size: 18px;
                margin: 20px 0;
            }
            
            .footer {
                margin-top: 30px;
                color: #888;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏠 AccoFinder</h1>
            <div class="status">✅ OK</div>
            <div class="message">
                AccoFinder is running successfully!
            </div>
            <div class="footer">
                ⚡ Server is operational
            </div>
        </div>
    </body>
    </html>
    `);
});
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', houseBookingRoutes);
app.use('/api/rooms', roomRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
export { connectDB };
