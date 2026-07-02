import prisma from '../config/database.js';

export const sendNotification = async (app, userId, type, title, body, referenceId = null) => {
  try {
    // 1. Check user notification preferences
    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (preferences) {
      const typeKeyMap = {
        'JOIN_REQUEST': 'joinRequest',
        'JOIN_ACCEPTED': 'joinRequest',
        'JOIN_REJECTED': 'joinRequest',
        'MEMORY_TAGGED': 'memoryTagged',
        'PROFILE_UPDATED': 'profileUpdated',
        'BIRTHDAY_REMINDER': 'birthdayReminder',
        'ANNIVERSARY_REMINDER': 'anniversaryReminder',
        'NEW_MEMBER': 'newMember'
      };

      const preferenceKey = typeKeyMap[type];
      if (preferenceKey && !preferences[preferenceKey]) {
        console.log(`Notification of type ${type} suppressed by user preferences for user ${userId}`);
        return null; // Suppressed
      }
    }

    // 2. Create notification record in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        referenceId
      }
    });

    // 3. Emit via Socket.io if active
    const io = app.get('io');
    if (io) {
      // Emit to user's private notification room
      io.to(`member_${userId}`).emit('new_notification', notification);
      console.log(`Emitted socket notification to member_${userId}`);
    }

    return notification;
  } catch (err) {
    console.error('Failed to trigger notification:', err);
    return null;
  }
};
