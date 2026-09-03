import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../../models/User.mjs';
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
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          user.googleId = profile.id;
          if (!user.isEmailVerified) {
            user.isEmailVerified = true;
          }
          await user.save();
        } else {
          const email = profile.emails[0].value;
          const googleNumber = `g${Date.now()}`;

          user = await User.create({
            firstName: profile.name.givenName || 'Google',
            surname: profile.name.familyName || 'User',
            email,
            phone: googleNumber,
            residentialAddress: '',
            googleId: profile.id,
            role: 'CLIENT',
            isEmailVerified: true,
          });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  },
);

export default googleStrategy;
