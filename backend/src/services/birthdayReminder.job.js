import cron from 'node-cron';
import prisma from '../config/database.js';
import { sendNotification } from './notification.service.js';

export const initBirthdayReminderJob = (app) => {
  // Run daily at 8:00 AM (0 8 * * *)
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily Birthday and Anniversary reminder sweep...');
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1; // 1-indexed
      const currentDay = today.getDate();

      // 1. Process Birthdays
      const members = await prisma.familyMember.findMany({
        where: {
          isLiving: true,
          isDeleted: false,
          dob: { not: null }
        },
        include: {
          memberships: {
            include: {
              family: {
                include: {
                  memberships: {
                    include: {
                      member: {
                        include: { user: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const birthdayMembers = members.filter(m => {
        const birthDate = new Date(m.dob);
        return birthDate.getMonth() + 1 === currentMonth && birthDate.getDate() === currentDay;
      });

      for (const bMember of birthdayMembers) {
        // Collect all family userIds to alert (excluding the birthday member)
        const userIdsToNotify = new Set();
        for (const membership of bMember.memberships) {
          const familyMembers = membership.family.memberships;
          for (const famMem of familyMembers) {
            if (famMem.memberId !== bMember.id && famMem.member.user) {
              userIdsToNotify.add(famMem.member.user.id);
            }
          }
        }

        for (const uId of userIdsToNotify) {
          await sendNotification(
            app,
            uId,
            'BIRTHDAY_REMINDER',
            'Birthday Reminder 🎂',
            `It's ${bMember.fullName}'s birthday today! Don't forget to wish them a wonderful day.`,
            bMember.id
          );
        }
      }

      // 2. Process Wedding Anniversaries
      const marriageEvents = await prisma.timelineEvent.findMany({
        where: {
          type: 'MARRIAGE'
        },
        include: {
          member: {
            include: {
              memberships: {
                include: {
                  family: {
                    include: {
                      memberships: {
                        include: {
                          member: {
                            include: { user: true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const anniversaryEvents = marriageEvents.filter(e => {
        const eventDate = new Date(e.eventDate);
        return eventDate.getMonth() + 1 === currentMonth && eventDate.getDate() === currentDay;
      });

      for (const anniv of anniversaryEvents) {
        const userIdsToNotify = new Set();
        for (const membership of anniv.member.memberships) {
          const familyMembers = membership.family.memberships;
          for (const famMem of familyMembers) {
            if (famMem.memberId !== anniv.memberId && famMem.member.user) {
              userIdsToNotify.add(famMem.member.user.id);
            }
          }
        }

        for (const uId of userIdsToNotify) {
          await sendNotification(
            app,
            uId,
            'ANNIVERSARY_REMINDER',
            'Anniversary Reminder 💖',
            `Happy Marriage Anniversary to ${anniv.member.fullName}!`,
            anniv.memberId
          );
        }
      }

      console.log('Daily sweep completed successfully.');
    } catch (err) {
      console.error('Failed to run daily sweep job:', err);
    }
  });
};
