/**
 * Migration: Sync existing points from pointsTransactions to userPointsLedgers
 * 
 * This script recalculates and syncs all user points balances from their transaction history.
 * Runs automatically on server startup to ensure all old points are reflected in userPointsLedgers.
 */

import { db } from '../db';
import { users } from '../../shared/schema';
import { userPointsLedgers } from '../../shared/schema-blockchain';
import { eq, sql } from 'drizzle-orm';
import { updateUserPointsBalance, ensureUserPointsLedger } from '../blockchain/db-utils';

let syncCompleted = false;

export async function syncExistingPoints() {
  // Only run once per process
  if (syncCompleted) {
    console.log('⏭️  Points sync already completed this session, skipping...');
    return;
  }

  console.log('\n📊 Syncing existing points from transaction history...\n');
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} total users`);
    
    let synced = 0;
    let skipped = 0;

    for (const user of allUsers) {
      try {
        // Ensure ledger exists
        await ensureUserPointsLedger(user.id);
        
        // Try to recalculate balance from transactions
        try {
          await updateUserPointsBalance(user.id);
          synced++;
          
          if (synced % 10 === 0) {
            console.log(`✅ Synced ${synced}/${allUsers.length} users...`);
          }
        } catch (txErr) {
          // If transaction query fails, just use the user's points field directly
          if (user.points && user.points > 0) {
            try {
              // Try to convert to BigInt if it's a string or number
              let pointsValue = 0n;
              if (typeof user.points === 'string') {
                pointsValue = BigInt(user.points);
              } else if (typeof user.points === 'number') {
                // If it's already a number without wei conversion
                pointsValue = BigInt(Math.floor(user.points));
              }
              
              if (pointsValue > 0n) {
                await db
                  .update(userPointsLedgers)
                  .set({
                    pointsBalance: pointsValue,
                    totalPointsEarned: pointsValue,
                  })
                  .where(eq(userPointsLedgers.userId, user.id));
                synced++;
              } else {
                skipped++;
              }
            } catch (convErr) {
              console.error(`⚠️  Could not convert points for user ${user.id}:`, (convErr as any)?.message);
              skipped++;
            }
          } else {
            skipped++;
          }
        }
      } catch (err) {
        console.error(`⚠️  Error syncing user ${user.id}:`, (err as any)?.message || err);
        skipped++;
      }
    }

    console.log(`\n✅ Points synchronization complete!`);
    console.log(`   - Synced: ${synced} users`);
    console.log(`   - Skipped: ${skipped} users`);
    console.log(`   - Total: ${allUsers.length} users\n`);
    
    syncCompleted = true;

  } catch (error) {
    console.error('⚠️ Points sync migration issue (non-blocking):', (error as any)?.message || error);
    // Don't throw - this is a one-time operation that's non-critical
    syncCompleted = true;
  }
}
