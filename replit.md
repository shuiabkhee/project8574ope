# Bantah Project Status

## Overview
A social betting and challenges platform where users can compete in various challenges and earn Bantah Points (BPTS).

## Key Features
- **Challenges**: Admin-created and P2P challenges.
- **Points System**: Users earn BPTS for participation and winning.
- **Leaderboard**: Global ranking of players (excluding administrators).
- **Wallet Integration**: Support for blockchain wallets (Base Testnet Sepolia).
- **Authentication**: Privy for wallet connection and Supabase-compatible JWTs for backend auth.

## Recent Changes (January 30, 2026)
- **Leaderboard Filtering**: Updated `server/routes/api-points.ts` to exclude 'admin', 'superadmin', and users with `isAdmin: true` from the global rankings.
- **Authentication Security**: Refactored `SupabaseAuthMiddleware` in `server/supabaseAuth.ts` to improve token decoding and logging.
- **Points Calculation Fix**: Modified `updateUserPointsBalance` in `server/blockchain/db-utils.ts` to correctly handle `admin_claim_weekly` and `admin_payout_weekly` transactions as additions to the balance, ensuring points are correctly reflected in user wallets.

## Architecture
- **Frontend**: React/Vite with Tailwind CSS and Shadcn UI.
- **Backend**: Express server with Drizzle ORM.
- **Database**: PostgreSQL (Neon).
- **Auth**: Privy + JWT.
- **Blockchain**: Base Testnet Sepolia (84532).
