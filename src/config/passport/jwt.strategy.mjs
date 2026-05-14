import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../../models/User.mjs';
import dotenv from 'dotenv';
dotenv.config();

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_ACCESS_SECRET 
};

const jwtStrategy = new JwtStrategy(opts, async (jwtPayload, done) => {
  try {
    const user = await User.findById(jwtPayload.sub);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
});

export default jwtStrategy;
