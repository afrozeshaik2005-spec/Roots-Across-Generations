import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication token missing or invalid format', status: 401 }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        familyMember: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
            memberships: {
              select: {
                familyId: true,
                role: true,
                isPrimary: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User associated with this token no longer exists', status: 401 }
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      memberId: user.familyMember?.id || null,
      fullName: user.familyMember?.fullName || null,
      memberships: user.familyMember?.memberships || []
    };

    next();
  } catch (err) {
    let message = 'Invalid or expired authentication token';
    let status = 401;

    if (err.name === 'TokenExpiredError') {
      message = 'Authentication token expired';
      status = 401; // Can let front-end handle refresh token trigger
    }

    res.status(status).json({
      success: false,
      error: { message, status }
    });
  }
};

export const authenticateJWTOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        familyMember: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true,
            memberships: {
              select: {
                familyId: true,
                role: true,
                isPrimary: true
              }
            }
          }
        }
      }
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        memberId: user.familyMember?.id || null,
        fullName: user.familyMember?.fullName || null,
        memberships: user.familyMember?.memberships || []
      };
    }
    next();
  } catch (err) {
    next();
  }
};
