// Deprecated: Supabase wallet-login route removed. This file kept as a harmless stub
import { Router } from 'express';

const router = Router();

router.use((req, res) => {
  res.status(410).json({ error: 'Deprecated: wallet-login is removed. Use Privy auth only.' });
});

    if (!walletAddress) {
      return res.status(400).json({ error: 'Missing walletAddress' });
    }

    // Use Privy user ID if provided, otherwise generate from wallet
    const userId = privyUserId || crypto
      .createHash('sha256')
      .update(walletAddress.toLowerCase())
      .digest('hex')
      .slice(0, 32);

    console.log(`   Using user ID: ${userId}`);

    // Check if user exists, create if not
    let user = await storage.getUser(userId);
    
    if (!user) {
      console.log('   Creating new user...');
      const userEmail = email || `${walletAddress.toLowerCase()}@wallet.local`;
      const username = email?.split('@')[0] || `user_${walletAddress.slice(-8)}`;
      
      user = await storage.upsertUser({
        id: userId,
        email: userEmail,
        password: 'WALLET_AUTH_USER',
        firstName: 'User',
        lastName: 'Wallet',
        username: username,
        profileImageUrl: null,
        walletAddress: walletAddress.toLowerCase(),
      });
    } else {
      console.log('   User exists, updating wallet address...');
      // Update wallet address if different
      if (user.walletAddress !== walletAddress.toLowerCase()) {
        await storage.updateUser(userId, { walletAddress: walletAddress.toLowerCase() });
        user.walletAddress = walletAddress.toLowerCase();
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate a Supabase JWT token
    const token = generateSupabaseToken(user.id, walletAddress);

    if (!token) {
      return res.status(500).json({ error: 'Failed to generate token' });
    }

    console.log(`✅ Login successful for wallet: ${walletAddress}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        wallet: user.walletAddress,
      },
    });
  } catch (error: any) {
    console.error('❌ Wallet login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
