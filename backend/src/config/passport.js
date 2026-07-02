import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database.js';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`;

passport.use(new GoogleStrategy({
  clientID: googleClientId,
  clientSecret: googleClientSecret,
  callbackURL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile?.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google account has no email'), null);
    }
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email }] }
    });
    if (!user) {
      user = await prisma.user.create({
        data: { email, googleId: profile.id }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id }
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});

export default passport;
