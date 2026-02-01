/**
 * Admin Challenge Timeline Helper
 * Generates a dispute-resolution timeline for P2P challenges
 */

export interface ChallengeEvent {
  event: string;
  timestamp: Date | null;
  status: 'completed' | 'pending' | 'delayed';
  details?: string;
}

export interface ChallengeTimeline {
  events: ChallengeEvent[];
  hasDelays: boolean;
  suspiciousActivity: string[];
  disputeHighRiskFactors: string[];
}

export function generateChallengeTimeline(challenge: any): ChallengeTimeline {
  const events: ChallengeEvent[] = [];
  const suspiciousActivity: string[] = [];
  const disputeHighRiskFactors: string[] = [];
  let hasDelays = false;

  // Event 1: Challenge Created
  if (challenge.createdAt) {
    events.push({
      event: '📝 Challenge Created',
      timestamp: new Date(challenge.createdAt),
      status: 'completed',
      details: challenge.title,
    });
  }

  // Event 2: Challenge Accepted (for P2P)
  if (challenge.blockchainAcceptedAt) {
    const createdDate = challenge.createdAt ? new Date(challenge.createdAt) : null;
    const acceptedDate = new Date(challenge.blockchainAcceptedAt);
    
    const hoursDiff = createdDate 
      ? Math.abs(acceptedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
      : 0;

    const acceptStatus = hoursDiff > 72 ? 'delayed' : 'completed';
    if (acceptStatus === 'delayed') {
      hasDelays = true;
      suspiciousActivity.push(`⚠️ Challenge accepted after ${Math.round(hoursDiff)} hours`);
    }

    events.push({
      event: '✅ Challenge Accepted',
      timestamp: acceptedDate,
      status: acceptStatus,
      details: `By ${challenge.challengedUser?.username || 'Unknown'}`,
    });
  }

  // Event 3: Proofs Submitted
  if (challenge.creatorProof) {
    events.push({
      event: '📸 Creator Proof Submitted',
      timestamp: null, // Would need to track this separately
      status: 'completed',
      details: challenge.creatorProof.substring(0, 50) + '...',
    });
  }

  if (challenge.acceptorProof) {
    events.push({
      event: '📸 Acceptor Proof Submitted',
      timestamp: null, // Would need to track this separately
      status: 'completed',
      details: challenge.acceptorProof.substring(0, 50) + '...',
    });
  }

  // Event 4: Both Proofs Ready
  if (challenge.creatorProof && challenge.acceptorProof) {
    events.push({
      event: '🎯 Both Proofs Submitted',
      timestamp: null,
      status: 'completed',
      details: 'Waiting for settlement',
    });
  }

  // Event 5: Voting Period
  if (challenge.votingEndsAt) {
    const votingEnd = new Date(challenge.votingEndsAt);
    const now = new Date();

    events.push({
      event: '🗳️ Voting Period',
      timestamp: votingEnd,
      status: votingEnd > now ? 'pending' : 'completed',
      details: `Ends: ${votingEnd.toLocaleString()}`,
    });
  }

  // Event 6: Creator Released Settlement
  if (challenge.creatorReleased && challenge.creatorReleasedAt) {
    events.push({
      event: '💰 Creator Released Settlement',
      timestamp: new Date(challenge.creatorReleasedAt),
      status: 'completed',
      details: `Released at ${new Date(challenge.creatorReleasedAt).toLocaleTimeString()}`,
    });
  } else if (challenge.creatorProof && challenge.acceptorProof && !challenge.creatorReleased) {
    events.push({
      event: '⏸️ Creator NOT Released (HESITANT)',
      timestamp: null,
      status: 'pending',
      details: 'Both proofs submitted but creator refusing to release',
    });
    disputeHighRiskFactors.push('🚩 Creator refusing to release after both proofs submitted');
    hasDelays = true;
  }

  // Event 7: Acceptor Released Settlement
  if (challenge.acceptorReleased && challenge.acceptorReleasedAt) {
    events.push({
      event: '💰 Acceptor Released Settlement',
      timestamp: new Date(challenge.acceptorReleasedAt),
      status: 'completed',
      details: `Released at ${new Date(challenge.acceptorReleasedAt).toLocaleTimeString()}`,
    });
  } else if (challenge.creatorProof && challenge.acceptorProof && !challenge.acceptorReleased) {
    events.push({
      event: '⏸️ Acceptor NOT Released (HESITANT)',
      timestamp: null,
      status: 'pending',
      details: 'Both proofs submitted but acceptor refusing to release',
    });
    disputeHighRiskFactors.push('🚩 Acceptor refusing to release after both proofs submitted');
    hasDelays = true;
  }

  // Event 8: Challenge Completed
  if (challenge.completedAt) {
    events.push({
      event: '🏁 Challenge Completed',
      timestamp: new Date(challenge.completedAt),
      status: 'completed',
      details: `Result: ${challenge.result}`,
    });
  }

  // Event 9: Dispute Status
  if (challenge.hasDispute) {
    events.push({
      event: '⚠️ Dispute Raised',
      timestamp: null,
      status: 'pending',
      details: challenge.disputeReason,
    });
    disputeHighRiskFactors.push(`Dispute reason: ${challenge.disputeReason}`);
  }

  // Check for suspicious patterns
  if (challenge.creatorHesitant) {
    suspiciousActivity.push('🚩 Creator marked as hesitant');
  }
  if (challenge.acceptorHesitant) {
    suspiciousActivity.push('🚩 Acceptor marked as hesitant');
  }

  // Timeline duration check
  if (challenge.createdAt && challenge.completedAt) {
    const durationHours = Math.abs(
      new Date(challenge.completedAt).getTime() - new Date(challenge.createdAt).getTime()
    ) / (1000 * 60 * 60);

    if (durationHours > 168) { // More than a week
      disputeHighRiskFactors.push(`⚠️ Challenge took ${Math.round(durationHours)} hours to complete`);
    }
  }

  return {
    events,
    hasDelays,
    suspiciousActivity,
    disputeHighRiskFactors,
  };
}

/**
 * Format timeline for display
 */
export function formatTimelineForDisplay(timeline: ChallengeTimeline): string {
  let output = '📋 CHALLENGE TIMELINE\n';
  output += '═'.repeat(50) + '\n\n';

  // Events
  timeline.events.forEach((event, index) => {
    const timeStr = event.timestamp 
      ? event.timestamp.toLocaleString()
      : '(pending)';
    
    output += `${index + 1}. ${event.event}\n`;
    output += `   Time: ${timeStr}\n`;
    output += `   Status: ${event.status.toUpperCase()}\n`;
    if (event.details) {
      output += `   Details: ${event.details}\n`;
    }
    output += '\n';
  });

  // Suspicious Activity
  if (timeline.suspiciousActivity.length > 0) {
    output += '\n⚠️ SUSPICIOUS ACTIVITY\n';
    output += '─'.repeat(50) + '\n';
    timeline.suspiciousActivity.forEach(activity => {
      output += `  ${activity}\n`;
    });
  }

  // Dispute Risk Factors
  if (timeline.disputeHighRiskFactors.length > 0) {
    output += '\n🚩 HIGH RISK FACTORS FOR DISPUTES\n';
    output += '─'.repeat(50) + '\n';
    timeline.disputeHighRiskFactors.forEach(factor => {
      output += `  ${factor}\n`;
    });
  }

  return output;
}

/**
 * Suggest admin action based on timeline
 */
export function suggestAdminAction(challenge: any, timeline: ChallengeTimeline): string {
  if (timeline.disputeHighRiskFactors.length > 2) {
    return 'URGENT: Multiple high-risk factors detected. Consider immediate intervention.';
  }

  if (challenge.creatorHesitant && challenge.acceptorReleased) {
    return 'ACTION: Force release creator\'s settlement. Acceptor has already released.';
  }

  if (challenge.acceptorHesitant && challenge.creatorReleased) {
    return 'ACTION: Force release acceptor\'s settlement. Creator has already released.';
  }

  if (challenge.creatorProof && challenge.acceptorProof && !challenge.creatorReleased && !challenge.acceptorReleased) {
    return 'ACTION: Both proofs submitted. Review evidence and determine winner to unlock settlement.';
  }

  if (challenge.hasDispute) {
    return 'ACTION: Dispute detected. Review chat history and evidence to arbitrate.';
  }

  return 'STATUS: Challenge progressing normally. Monitor for updates.';
}
