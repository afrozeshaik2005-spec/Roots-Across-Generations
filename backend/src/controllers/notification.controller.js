import prisma from '../config/database.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    next(err);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found', status: 404 }
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      success: true,
      notification: updated
    });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
};

export const getNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        joinRequest: true,
        memoryTagged: true,
        profileUpdated: true,
        birthdayReminder: true,
        anniversaryReminder: true,
        newMember: true
      }
    });

    res.json({
      success: true,
      preferences
    });
  } catch (err) {
    next(err);
  }
};

export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { joinRequest, memoryTagged, profileUpdated, birthdayReminder, anniversaryReminder, newMember } = req.body;

    const updated = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        joinRequest: joinRequest ?? true,
        memoryTagged: memoryTagged ?? true,
        profileUpdated: profileUpdated ?? true,
        birthdayReminder: birthdayReminder ?? true,
        anniversaryReminder: anniversaryReminder ?? true,
        newMember: newMember ?? true
      },
      create: {
        userId,
        joinRequest: joinRequest ?? true,
        memoryTagged: memoryTagged ?? true,
        profileUpdated: profileUpdated ?? true,
        birthdayReminder: birthdayReminder ?? true,
        anniversaryReminder: anniversaryReminder ?? true,
        newMember: newMember ?? true
      }
    });

    res.json({
      success: true,
      preferences: updated
    });
  } catch (err) {
    next(err);
  }
};
