import { Router } from 'express';
import { signup, login, refresh, logout, getMe } from '../controllers/auth.controller.js';
import passport from '../config/passport.js';
import prisma from '../config/database.js';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// ------------------------------
// Existing REST endpoints
// ------------------------------
router.post('/signup', signup);
router.post('/login', login);
router.get('/google', (req, res, next) => {
  const { redirectTo } = req.query;
  const state = redirectTo ? Buffer.from(JSON.stringify({ redirectTo })).toString('base64') : undefined;
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
    session: false
  })(req, res, next);
}, async (req, res) => {
  try {
    const profile = req.user;
    const email = profile?.emails?.[0]?.value;
    if (!email) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=no_email`);
    }
    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: profile.id },
          { email }
        ]
      }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          googleId: profile.id,
          notificationPreferences: { create: {} }
        }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id }
      });
    }

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: Math.random().toString(36).substring(2) + Date.now().toString(36),
        expiresAt
      }
    });

    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, sessionId: session.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Decode redirectTo from Google state
    let redirectTo = '';
    if (req.query.state) {
      try {
        const decodedState = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        if (decodedState.redirectTo) {
          redirectTo = decodedState.redirectTo;
        }
      } catch (e) {
        // ignore
      }
    }

    // Redirect to client with token
    const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${accessToken}${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=auth_callback_failed`);
  }
});
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateJWT, getMe);

export default router;
