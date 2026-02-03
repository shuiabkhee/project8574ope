/**
 * Challenge Activity Notification Helpers
 * Sends notifications for ongoing challenge events: votes, escrow, payments, disputes, messages, proofs, etc.
 */

import { notificationService, NotificationEvent, NotificationChannel, NotificationPriority } from '../notificationService';

/**
 * Notify user when opponent voted/submitted their decision
 */
export async function notifyOpponentVoted(
  userId: string,
  challengeId: number,
  opponentName: string,
  challengeTitle: string
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.CHALLENGE_JOINED_FRIEND,
    title: '🗳️ Opponent Voted!',
    body: `@${opponentName} submitted their vote for "${challengeTitle}". Your decision is needed.`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      opponentName,
      challengeTitle,
      actionUrl: `/challenges/${challengeId}`,
    },
  });
}

/**
 * Notify user when escrow is locked for a challenge
 */
export async function notifyEscrowLocked(
  userId: string,
  challengeId: number,
  amount: string,
  challengeTitle: string
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.CHALLENGE_STARTING_SOON,
    title: '🔒 Stakes Locked!',
    body: `${amount} locked in escrow for "${challengeTitle}". Challenge is now active!`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      amount,
      challengeTitle,
      actionUrl: `/challenges/${challengeId}`,
    },
  });
}

/**
 * Notify user when they receive a payment (opponent's stake or pot distribution)
 */
export async function notifyPaymentReceived(
  userId: string,
  challengeId: number,
  amount: string,
  reason: string,
  challengeTitle: string
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.BONUS_ACTIVATED,
    title: '💰 Payment Received!',
    body: `You received ${amount} from "${challengeTitle}". ${reason}`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      amount,
      reason,
      actionUrl: `/wallet`,
    },
  });
}

/**
 * Notify user when a dispute is raised on their challenge
 */
export async function notifyDisputeRaised(
  userId: string,
  challengeId: number,
  challengeTitle: string,
  disputeReason: string,
  raisedBy: string
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.ACCOUNT_ALERT,
    title: '🚩 Dispute Raised!',
    body: `@${raisedBy} raised a dispute: "${disputeReason}". Admin review required.`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      disputeReason,
      raisedBy,
      actionUrl: `/challenges/${challengeId}`,
    },
  });
}

/**
 * Notify user when challenge deadline is approaching (5 minutes warning)
 */
export async function notifyCountdownReminder(
  userId: string,
  challengeId: number,
  challengeTitle: string,
  minutesRemaining: number
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.CHALLENGE_ENDING_SOON,
    title: '⏰ Voting Deadline Alert!',
    body: `"${challengeTitle}" voting closes in ${minutesRemaining} minutes. Submit your vote now!`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      minutesRemaining,
      actionUrl: `/challenges/${challengeId}`,
    },
  });
}

/**
 * Notify user when opponent sends a new chat message
 */
export async function notifyNewChatMessage(
  userId: string,
  challengeId: number,
  senderName: string,
  messagePreview: string,
  challengeTitle: string
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.CHALLENGE_JOINED_FRIEND,
    title: '💬 New Message in Challenge',
    body: `@${senderName}: "${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    data: {
      challengeId,
      senderName,
      messagePreview,
      actionUrl: `/challenges/${challengeId}`,
    },
  });
}

/**
 * Notify user when opponent submits proof/evidence for challenge outcome
 */
export async function notifyProofSubmitted(
  userId: string,
  challengeId: number,
  opponentName: string,
  challengeTitle: string
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.POINTS_EARNED,
    title: '📸 Proof Submitted!',
    body: `@${opponentName} submitted evidence for "${challengeTitle}". Review and vote now.`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      opponentName,
      actionUrl: `/challenges/${challengeId}`,
    },
  });
}

/**
 * Notify user when payment is released/transferred from escrow
 */
export async function notifyPaymentReleased(
  userId: string,
  challengeId: number,
  amount: string,
  challengeTitle: string,
  recipientName?: string
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.BONUS_ACTIVATED,
    title: '✅ Payment Released!',
    body: `${amount} released from "${challengeTitle}" escrow${recipientName ? ` to @${recipientName}` : ''}. Check your wallet.`,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      amount,
      recipientName,
      actionUrl: `/wallet`,
    },
  });
}

/**
 * Batch notify both participants when challenge moves to active state
 */
export async function notifyChallengeActivated(
  userId: string,
  challengeId: number,
  opponentName: string,
  challengeTitle: string,
  durationHours: number
): Promise<boolean> {
  return notificationService.send({
    userId,
    challengeId: challengeId.toString(),
    event: NotificationEvent.CHALLENGE_JOINED_FRIEND,
    title: '⚔️ Challenge is Active!',
    body: `Challenge with @${opponentName} started! You have ${durationHours} hours to complete it.`,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    data: {
      challengeId,
      opponentName,
      durationHours,
      actionUrl: `/challenges/${challengeId}`,
    },
  });
}
