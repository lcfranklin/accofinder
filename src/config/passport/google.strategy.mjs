import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../../models/User.mjs';
import dotenv from 'dotenv';

dotenv.config();

const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          user.googleId = profile.id;
          await user.save();
        } else {
          user = await User.create({
            name: {
              firstName: profile.name.givenName,
              surname: profile.name.familyName,
            },
            email: profile.emails[0].value,
            googleId: profile.id,
            role: 'client', 
          });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);

export default googleStrategy;
