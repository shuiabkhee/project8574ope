/**
 * Clear all admin-created challenges from the database
 */

import * as dotenv from 'dotenv';
dotenv.config();
import { db } from './server/db.js';
import { challenges } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function clearAdminChallenges() {
  try {
    console.log('🔍 Checking admin-created challenges...');
    
    // Count before deletion
    const countBefore = await db
      .select()
      .from(challenges)
      .where(eq(challenges.adminCreated, true));
    
    console.log(`📊 Found ${countBefore.length} admin-created challenges`);
    
    if (countBefore.length === 0) {
      console.log('✅ No admin-created challenges to delete');
      process.exit(0);
    }
    
    // Delete them
    console.log('🗑️  Deleting admin-created challenges...');
    const result = await db
      .delete(challenges)
      .where(eq(challenges.adminCreated, true));
    
    // Verify
    const countAfter = await db
      .select()
      .from(challenges)
      .where(eq(challenges.adminCreated, true));
    
    console.log(`✅ Deleted ${countBefore.length} admin-created challenges`);
    console.log(`✅ Remaining admin-created challenges: ${countAfter.length}`);
    console.log('✅ Cleanup complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing challenges:', error);
    process.exit(1);
  }
}

clearAdminChallenges();
