import passport from 'passport';
import User from '../../models/User.mjs';
import localStrategy from './local.strategy.mjs';
import googleStrategy from './google.strategy.mjs';

// Serialize user into the session (save user ID)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session (load user from DB using ID)
passport.deserializeUser(async (id, done) => {
  try {
    if (!id) return done(null, false);
    const user = await User.findById(id);
    if (!user) return done(null, false);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Register strategies
passport.use(localStrategy);
passport.use(googleStrategy);

export default passport;
