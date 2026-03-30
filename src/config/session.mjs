import session from 'express-session';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';

dotenv.config();

const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL_CLASTER || process.env.MONGO_URI_CAMPUSS,
    collectionName: 'sessions',
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, 
    secure: process.env.MODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
});

export default sessionConfig;
