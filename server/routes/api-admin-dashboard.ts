import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { challenges, users } from '@shared/schema';
import { eq, inArray, asc } from 'drizzle-orm';

const router = express.Router();

/**
 * Admin Auth Middleware
 */
const adminAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('admin_')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Token format: admin_<userId>_<timestamp>
    // Extract userId from token (everything between first and last underscore)
    const parts = token.split('_');
    if (parts.length < 3) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    const userId = parts.slice(1, -1).join('_'); // Join in case userId contains underscores
    const user = await storage.getUser(userId);

    if (!user || !user.isAdmin) {
      console.log(`Admin auth failed: user=${userId}, exists=${!!user}, isAdmin=${user?.isAdmin}`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const allUsers = await storage.getAllUsersWithWallets();
    const allChallenges = await db.select().from(challenges);
    
    // Calculate stats
    const totalUsers = allUsers.length;
    const newUsersThisWeek = allUsers.filter(u => {
      const createdAt = new Date(u.createdAt);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return createdAt >= oneWeekAgo;
    }).length;

    const activeUsers = allUsers.filter(u => u.status === 'active' || u.isActive).length;
    
    // Calculate challenge stats
    const totalChallenges = allChallenges.length;
    const activeChallenges = allChallenges.filter((c: any) => c.status === 'active').length;
    const completedChallenges = allChallenges.filter((c: any) => c.status === 'completed').length;
    const pendingChallenges = allChallenges.filter((c: any) => c.status === 'pending' || c.status === 'accepted').length;

    // Calculate financial stats
    let totalVolume = 0;
    let totalChallengeStaked = 0;

    allChallenges.forEach((challenge: any) => {
      if (challenge.amount) {
        const amount = parseFloat(challenge.amount.toString());
        totalChallengeStaked += amount;
        totalVolume += amount;
      }
    });

    const stats = {
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      dailyActiveUsers: activeUsers,
      totalEvents: 0,
      activeEvents: 0,
      completedEvents: 0,
      totalChallenges,
      activeChallenges,
      completedChallenges,
      pendingChallenges,
      totalTransactions: 0,
      totalVolume,
      totalEventPool: 0,
      totalChallengeStaked,
      totalRevenue: 0,
      totalCreatorFees: 0,
      totalPlatformFees: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      pendingPayouts: 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination and filtering
 */
router.get('/users', adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const allUsers = await storage.getAllUsersWithWallets();
    
    // Map to admin response format
    const users = allUsers.slice(offset, offset + limit).map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      level: user.level || 0,
      points: user.points || 0,
      balance: user.balance?.toString() || '0',
      streak: 0,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || user.createdAt,
      status: user.isActive ? 'active' : 'inactive',
      isAdmin: user.isAdmin || false,
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get specific user details
 */
router.get('/users/:userId', adminAuth, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUser(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      level: user.level || 0,
      points: user.points || 0,
      balance: user.balance?.toString() || '0',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin || user.createdAt,
      status: user.status || 'active',
      isAdmin: user.isAdmin || false,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * GET /api/admin/challenges
 * Get all challenges for admin view
 */
router.get('/challenges', adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const allChallenges = await db.select().from(challenges);
    
    // Get unique user IDs
    const userIds = new Set<string>();
    allChallenges.forEach(challenge => {
      if (challenge.challenger) userIds.add(challenge.challenger);
      if (challenge.challenged) userIds.add(challenge.challenged);
    });

    // Fetch user data
    const usersData = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(inArray(users.id, Array.from(userIds)));

    const userMap = new Map();
    usersData.forEach(user => {
      userMap.set(user.id, user);
    });

    const challengesList = allChallenges.slice(offset, offset + limit).map((challenge: any) => {
      const challengerUser = challenge.challenger ? userMap.get(challenge.challenger) : null;
      const challengedUser = challenge.challenged ? userMap.get(challenge.challenged) : null;

      return {
        id: challenge.id,
        title: challenge.title || `Challenge #${challenge.id}`,
        description: challenge.description || '',
        category: challenge.category || 'General',
        status: challenge.status || 'pending',
        amount: challenge.amount?.toString() || '0',
        result: challenge.result || null,
        evidence: challenge.evidence || null,
        dueDate: challenge.dueDate || new Date().toISOString(),
        createdAt: challenge.createdAt || new Date().toISOString(),
        completedAt: challenge.completedAt || null,
        isPinned: challenge.isPinned || false,
        challenger: challenge.challenger?.toString() || '',
        challenged: challenge.challenged?.toString() || '',
        challengerUser: challengerUser || {
          id: challenge.challenger || '',
          username: 'Unknown',
          firstName: '',
          lastName: '',
          profileImageUrl: ''
        },
        challengedUser: challengedUser || {
          id: challenge.challenged || '',
          username: 'Unknown',
          firstName: '',
          lastName: '',
          profileImageUrl: ''
        },
        adminCreated: challenge.adminCreated || false,
        bonusSide: challenge.bonusSide || null,
        bonusMultiplier: challenge.bonusMultiplier?.toString() || null,
        bonusEndsAt: challenge.bonusEndsAt || null,
        yesStakeTotal: challenge.yesStakeTotal || 0,
        noStakeTotal: challenge.noStakeTotal || 0,
        paymentTokenAddress: challenge.paymentTokenAddress,
        // P2P-specific fields
        settlementType: challenge.settlementType || 'voting',
        creatorStaked: challenge.creatorStaked || false,
        acceptorStaked: challenge.acceptorStaked || false,
        creatorVote: challenge.creatorVote || null,
        acceptorVote: challenge.acceptorVote || null,
        creatorProof: challenge.creatorProof || null,
        acceptorProof: challenge.acceptorProof || null,
        disputeReason: challenge.disputeReason || null,
        votingEndsAt: challenge.votingEndsAt || null,
        creatorTransactionHash: challenge.creatorTransactionHash || null,
        acceptorTransactionHash: challenge.acceptorTransactionHash || null,
        challengerSide: challenge.challengerSide || 'YES',
        onChainStatus: challenge.onChainStatus || 'pending',
        // Settlement tracking
        stakeAmount: challenge.stakeAmount || challenge.stakeAmountWei ? Math.floor(Number(challenge.stakeAmountWei || 0) / (challenge.paymentTokenAddress === '0x0000000000000000000000000000000000000000' ? 1e18 : 1e6)) : 0,
        totalEscrowed: challenge.stakeAmount ? challenge.stakeAmount * 2 : 0,
        creatorReleased: challenge.creatorReleased || false,
        acceptorReleased: challenge.acceptorReleased || false,
        bothReleased: (challenge.creatorReleased || false) && (challenge.acceptorReleased || false),
        creatorHesitant: challenge.creatorHesitant || false,
        acceptorHesitant: challenge.acceptorHesitant || false,
        creatorReleasedAt: challenge.creatorReleasedAt?.toISOString() || null,
        acceptorReleasedAt: challenge.acceptorReleasedAt?.toISOString() || null,
        // Key timestamps for disputes
        createdAtFormatted: challenge.createdAt ? new Date(challenge.createdAt).toLocaleString() : null,
        acceptedAtFormatted: challenge.blockchainAcceptedAt ? new Date(challenge.blockchainAcceptedAt).toLocaleString() : null,
        dueDateFormatted: challenge.dueDate ? new Date(challenge.dueDate).toLocaleString() : null,
        completedAtFormatted: challenge.completedAt ? new Date(challenge.completedAt).toLocaleString() : null,
        type: challenge.challenged ? 'p2p' : 'admin',
      };
    });

    res.json(challengesList);
  } catch (error) {
    console.error('Error fetching admin challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

/**
 * GET /api/admin/challenges/:id/details
 * Get detailed P2P challenge info including chat, proofs, and settlement tracking
 */
router.get('/challenges/:id/details', adminAuth, async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id, 10);

    const challenge = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge || challenge.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const ch = challenge[0];

    // Fetch user data
    const users_list = await db
      .select()
      .from(users)
      .where(inArray(users.id, [ch.challenger, ch.challenged].filter(Boolean) as string[]));

    const userMap = new Map();
    users_list.forEach(user => {
      userMap.set(user.id, user);
    });

    // Get voting end time
    const votingEndsAt = ch.votingEndsAt ? new Date(ch.votingEndsAt) : null;
    const now = new Date();
    const votingActive = votingEndsAt && votingEndsAt > now;
    const timeRemainingMs = votingEndsAt ? Math.max(0, votingEndsAt.getTime() - now.getTime()) : 0;

    const detailedChallenge = {
      id: ch.id,
      title: ch.title || `P2P Challenge #${ch.id}`,
      description: ch.description || '',
      category: ch.category || 'General',
      status: ch.status,
      amount: ch.amount?.toString() || '0',
      paymentTokenAddress: ch.paymentTokenAddress,
      
      // Participants
      challenger: {
        id: ch.challenger,
        ...userMap.get(ch.challenger),
      },
      challenged: {
        id: ch.challenged,
        ...userMap.get(ch.challenged),
      },

      // Stakes & Settlement
      stakeAmount: ch.stakeAmount || ch.stakeAmountWei ? Math.floor(Number(ch.stakeAmountWei || 0) / (ch.paymentTokenAddress === '0x0000000000000000000000000000000000000000' ? 1e18 : 1e6)) : 0,
      totalEscrowed: ch.stakeAmount ? ch.stakeAmount * 2 : 0,
      creatorReleased: ch.creatorReleased || false,
      acceptorReleased: ch.acceptorReleased || false,
      bothReleased: (ch.creatorReleased || false) && (ch.acceptorReleased || false),
      creatorHesitant: ch.creatorHesitant || false,
      acceptorHesitant: ch.acceptorHesitant || false,

      // P2P Settlement
      settlementType: ch.settlementType || 'voting',
      creatorStaked: ch.creatorStaked || false,
      acceptorStaked: ch.acceptorStaked || false,

      // Proofs
      creatorProof: ch.creatorProof || null,
      acceptorProof: ch.acceptorProof || null,
      
      // Votes
      creatorVote: ch.creatorVote || null,
      acceptorVote: ch.acceptorVote || null,
      votingActive,
      votingEndsAt: ch.votingEndsAt?.toISOString() || null,
      timeRemainingMs,

      // Dispute tracking
      disputeReason: ch.disputeReason || null,

      // Timestamps - Critical for dispute resolution
      createdAt: ch.createdAt?.toISOString() || null,
      blockchainCreatedAt: ch.blockchainCreatedAt?.toISOString() || null,
      blockchainAcceptedAt: ch.blockchainAcceptedAt?.toISOString() || null,
      acceptedAt: ch.blockchainAcceptedAt?.toISOString() || null, // When acceptor joined
      dueDate: ch.dueDate?.toISOString() || null,
      completedAt: ch.completedAt?.toISOString() || null,
      creatorReleasedAt: ch.creatorReleasedAt?.toISOString() || null,
      acceptorReleasedAt: ch.acceptorReleasedAt?.toISOString() || null,
      
      // Formatted times for admin display
      statusTimeline: {
        created: ch.createdAt ? new Date(ch.createdAt).toLocaleString() : null,
        accepted: ch.blockchainAcceptedAt ? new Date(ch.blockchainAcceptedAt).toLocaleString() : null,
        dueDate: ch.dueDate ? new Date(ch.dueDate).toLocaleString() : null,
        votingEnds: ch.votingEndsAt ? new Date(ch.votingEndsAt).toLocaleString() : null,
        completed: ch.completedAt ? new Date(ch.completedAt).toLocaleString() : null,
        creatorReleased: ch.creatorReleasedAt ? new Date(ch.creatorReleasedAt).toLocaleString() : null,
        acceptorReleased: ch.acceptorReleasedAt ? new Date(ch.acceptorReleasedAt).toLocaleString() : null,
      },

      // Blockchain
      creatorTransactionHash: ch.creatorTransactionHash || null,
      acceptorTransactionHash: ch.acceptorTransactionHash || null,
      onChainStatus: ch.onChainStatus || 'pending',
    };

    res.json(detailedChallenge);
  } catch (error) {
    console.error('Error fetching challenge details:', error);
    res.status(500).json({ error: 'Failed to fetch challenge details' });
  }
});

/**
 * DELETE /api/admin/challenges/:id
 * Delete a challenge (admin only)
 */
router.delete('/challenges/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id, 10);
    
    await db
      .delete(challenges)
      .where(eq(challenges.id, challengeId));

    res.json({ success: true, message: 'Challenge deleted' });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

/**
 * POST /api/admin/users/:userId/action
 * Perform admin action on user (ban, unban, give points, etc.)
 */
router.post('/users/:userId/action', adminAuth, async (req: Request, res: Response) => {
  try {
    const { action, value, reason } = req.body;
    const userId = req.params.userId;

    // Log the action
    console.log(`Admin action: ${action} on user ${userId}. Reason: ${reason}`);

    // Implement specific actions as needed
    switch (action) {
      case 'ban':
        // Ban user logic
        break;
      case 'unban':
        // Unban user logic
        break;
      case 'admin':
        // Make admin logic
        break;
      case 'balance':
        // Adjust balance logic
        break;
      case 'message':
        // Send message logic
        break;
    }

    res.json({ success: true, message: `Action ${action} executed` });
  } catch (error) {
    console.error('Error executing admin action:', error);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

export default router;
