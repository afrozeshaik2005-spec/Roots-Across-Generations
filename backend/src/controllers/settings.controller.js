import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const getUserAccount = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        googleId: true,
        theme: true,
        language: true,
        dateFormat: true,
        familyMember: {
          select: {
            id: true,
            fullName: true,
            profilePhoto: true
          }
        }
      }
    });

    res.json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserAccount = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // If email is changing, require password confirmation
    if (email && email !== user.email) {
      if (user.passwordHash) {
        if (!password) {
          return res.status(400).json({
            success: false,
            error: { message: 'Password confirmation is required to change email', status: 400 }
          });
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            error: { message: 'Incorrect password confirmation', status: 401 }
          });
        }
      }

      // Check if new email is already taken
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email address is already in use by another account', status: 409 }
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email }
      });
    }

    // If name is changing, update the associated FamilyMember record
    if (name && user.familyMemberId) {
      await prisma.familyMember.update({
        where: { id: user.familyMemberId },
        data: { fullName: name }
      });
    }

    res.json({
      success: true,
      message: 'Account details updated successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Old password and new password are required', status: 400 }
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        error: { message: 'Google accounts do not use a password. Set one by contacting support.', status: 400 }
      });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Incorrect current password', status: 401 }
      });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash }
    });

    res.json({
      success: true,
      message: 'Password successfully changed'
    });
  } catch (err) {
    next(err);
  }
};

export const softDeleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Soft delete user account
    await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    // Clean up active sessions
    await prisma.session.deleteMany({
      where: { userId }
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    });

    res.json({
      success: true,
      message: 'Your account has been successfully deleted'
    });
  } catch (err) {
    next(err);
  }
};

export const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Format output
    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: req.cookies.refreshToken
          ? jwt.decode(req.cookies.refreshToken)?.sessionId === s.id
          : false
      }))
    });
  } catch (err) {
    next(err);
  }
};

export const logoutAllOtherSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const refreshToken = req.cookies.refreshToken;
    let currentSessionId = null;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        currentSessionId = decoded.sessionId;
      } catch (e) {
        // Ignore
      }
    }

    await prisma.session.deleteMany({
      where: {
        userId,
        id: currentSessionId ? { not: currentSessionId } : undefined
      }
    });

    res.json({
      success: true,
      message: 'Logged out of all other active sessions successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const getUserFamilies = async (req, res, next) => {
  try {
    const memberId = req.user.memberId;

    if (!memberId) {
      return res.json({
        success: true,
        families: []
      });
    }

    const memberships = await prisma.familyMembership.findMany({
      where: { memberId },
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
    });

    res.json({
      success: true,
      families: memberships.map(m => ({
        id: m.id,
        familyId: m.family.id,
        readableFamilyId: m.family.familyId,
        familyName: m.family.name,
        role: m.role,
        isPrimary: m.isPrimary
      }))
    });
  } catch (err) {
    next(err);
  }
};

export const setPrimaryFamily = async (req, res, next) => {
  try {
    const { id } = req.params; // membershipId
    const memberId = req.user.memberId;

    await prisma.$transaction([
      prisma.familyMembership.updateMany({
        where: { memberId },
        data: { isPrimary: false }
      }),
      prisma.familyMembership.update({
        where: { id },
        data: { isPrimary: true }
      })
    ]);

    res.json({
      success: true,
      message: 'Primary family changed successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const leaveFamily = async (req, res, next) => {
  try {
    const { id } = req.params; // membershipId
    const memberId = req.user.memberId;

    const membership = await prisma.familyMembership.findUnique({
      where: { id },
      include: { family: true }
    });

    if (!membership || membership.memberId !== memberId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Membership not found', status: 404 }
      });
    }

    // Block if sole FOUNDER
    if (membership.role === 'FOUNDER') {
      const otherFounders = await prisma.familyMembership.count({
        where: {
          familyId: membership.familyId,
          role: 'FOUNDER',
          memberId: { not: memberId }
        }
      });

      if (otherFounders === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'You are the sole FOUNDER of this family and cannot leave until you nominate another FOUNDER.', status: 400 }
        });
      }
    }

    await prisma.familyMembership.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Left family successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const { theme, language, dateFormat } = req.body;
    const userId = req.user.id;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        theme: theme || undefined,
        language: language || undefined,
        dateFormat: dateFormat || undefined
      }
    });

    res.json({
      success: true,
      user: {
        theme: updated.theme,
        language: updated.language,
        dateFormat: updated.dateFormat
      }
    });
  } catch (err) {
    next(err);
  }
};
