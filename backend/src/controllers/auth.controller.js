import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/database.js';
import { signupSchema, loginSchema, googleLoginSchema } from '../validators/auth.validator.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign({ userId, sessionId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const signup = async (req, res, next) => {
  try {
    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', status: 400, details: validation.error.format() }
      });
    }

    const { email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'A user with this email address already exists', status: 409 }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        notificationPreferences: {
          create: {} // default settings will apply
        }
      },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', status: 400, details: validation.error.format() }
      });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password credentials', status: 401 }
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password credentials', status: 401 }
      });
    }

    // Create session in db
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: Math.random().toString(36).substring(2) + Date.now().toString(36),
        expiresAt
      }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id, session.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        memberId: user.familyMemberId
      }
    });
  } catch (err) {
    next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const validation = googleLoginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Validation failed', status: 400, details: validation.error.format() }
      });
    }

    const { idToken } = req.body;
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Google Identity token', status: 400 }
      });
    }

    const email = payload.email;
    const googleId = payload.sub;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          notificationPreferences: {
            create: {}
          }
        }
      });
    } else if (!user.googleId) {
      // Link Google Account to existing email account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId }
      });
    }

    // Create session in db
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: Math.random().toString(36).substring(2) + Date.now().toString(36),
        expiresAt
      }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id, session.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        memberId: user.familyMemberId
      }
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token cookie is missing', status: 401 }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token signature is invalid or expired', status: 401 }
      });
    }

    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId }
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return res.status(401).json({
        success: false,
        error: { message: 'Session has expired or was revoked', status: 401 }
      });
    }

    const accessToken = generateAccessToken(decoded.userId);
    res.json({
      success: true,
      accessToken
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await prisma.session.delete({
          where: { id: decoded.sessionId }
        }).catch(() => {});
      } catch (e) {
        // Token was invalid but we still clear cookies
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    });

    res.json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    if (!req.user.memberId) {
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          memberId: null,
          memberships: []
        }
      });
    }

    const member = await prisma.familyMember.findUnique({
      where: { id: req.user.memberId },
      include: {
        memberships: {
          include: {
            family: {
              select: {
                id: true,
                name: true,
                surname: true,
                familyId: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        memberId: req.user.memberId,
        fullName: member?.fullName || null,
        memberships: member?.memberships.map(m => ({
          familyId: m.family.id, // internal ID
          readableFamilyId: m.family.familyId, // SURNAME-XXXXX
          familyName: m.family.name,
          familySurname: m.family.surname,
          role: m.role,
          isPrimary: m.isPrimary
        })) || []
      }
    });
  } catch (err) {
    next(err);
  }
};
