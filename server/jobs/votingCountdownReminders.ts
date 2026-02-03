/**
 * Voting Countdown Reminder Job
 * Sends notifications when voting deadline is 5 minutes away
 * Run every minute (60 seconds)
 */

import { db } from '../db';
import { challenges, users } from '../../shared/schema';
import { gt, lt, and, eq, isNull } from 'drizzle-orm';
import { notifyCountdownReminder } from '../utils/challengeActivityNotifications';

// Track which challenges we've already reminded (to avoid duplicate reminders)
const remindersSent = new Set<number>();

export async function sendVotingCountdownReminders() {
  try {
    console.log(`\n⏰ Running voting countdown reminder job...`);

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const fourMinutesFromNow = new Date(now.getTime() + 4 * 60 * 1000);

    // Find active challenges where voting ends between 4-5 minutes from now
    // AND user hasn't voted yet (no creatorVote or acceptorVote)
    const countdownChallenges = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.status, 'active'),
          gt(challenges.votingEndsAt, fourMinutesFromNow),
          lt(challenges.votingEndsAt, fiveMinutesFromNow),
          isNull(challenges.completedAt)
        )
      );

    if (countdownChallenges.length === 0) {
      console.log(`✅ No challenges with 5-min voting countdown`);
      return;
    }

    console.log(`⏰ Found ${countdownChallenges.length} challenges with voting countdown`);

    // Send reminders to participants who haven't voted
    for (const challenge of countdownChallenges) {
      if (!challenge.votingEndsAt) continue;
      
      // Skip if we already sent reminder for this challenge
      if (remindersSent.has(challenge.id)) {
        continue;
      }

      const minutesUntilDeadline = Math.ceil((challenge.votingEndsAt.getTime() - now.getTime()) / (60 * 1000));

      // Notify creator if they haven't voted yet
      if (challenge.challenger && !challenge.creatorVote) {
        notifyCountdownReminder(
          challenge.challenger,
          challenge.id,
          challenge.title || `Challenge #${challenge.id}`,
          minutesUntilDeadline
        ).catch(err => console.warn(`Failed to send countdown reminder to creator:`, err.message));

        console.log(`⏰ Countdown reminder sent to creator for challenge #${challenge.id}`);
      }

      // Notify acceptor if they haven't voted yet
      if (challenge.challenged && !challenge.acceptorVote) {
        notifyCountdownReminder(
          challenge.challenged,
          challenge.id,
          challenge.title || `Challenge #${challenge.id}`,
          minutesUntilDeadline
        ).catch(err => console.warn(`Failed to send countdown reminder to acceptor:`, err.message));

        console.log(`⏰ Countdown reminder sent to acceptor for challenge #${challenge.id}`);
      }

      // Mark as reminded
      remindersSent.add(challenge.id);
    }
  } catch (error) {
    console.error('❌ Error in voting countdown reminder job:', error);
  }
}

export function startVotingCountdownReminderJob() {
  console.log(`🚀 Starting voting countdown reminder job (runs every 60 seconds)`);
  
  // Run every 60 seconds
  setInterval(() => {
    sendVotingCountdownReminders().catch(err => 
      console.error('Fatal error in voting countdown reminders:', err)
    );
  }, 60 * 1000);

  // Also run immediately
  sendVotingCountdownReminders().catch(err => 
    console.error('Fatal error in voting countdown reminders:', err)
  );
}
