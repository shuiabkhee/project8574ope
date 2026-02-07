#!/usr/bin/env python3
"""
Fix points_transactions by removing row-level security policy before changing column type
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n🔧 Fixing points_transactions table with RLS policies...\n")
    
    # Step 1: Disable RLS temporarily
    print("Step 1: Disabling Row-Level Security temporarily...")
    cursor.execute("ALTER TABLE points_transactions DISABLE ROW LEVEL SECURITY;")
    print("   ✅ RLS disabled")
    
    # Step 2: Drop policies
    print("\nStep 2: Dropping RLS policies...")
    cursor.execute("""
        SELECT policyname FROM pg_policies 
        WHERE pg_policies.tablename = 'points_transactions';
    """)
    policies = cursor.fetchall()
    
    for policy_info in policies:
        policy_name = policy_info[0]
        print(f"   Dropping policy: {policy_name}")
        # Quote the policy name since it may have spaces
        cursor.execute(f'DROP POLICY IF EXISTS "{policy_name}" ON points_transactions;')
    
    # Step 3: Change column types
    print("\nStep 3: Changing column types from UUID to VARCHAR...")
    cursor.execute("""
        ALTER TABLE points_transactions
        ALTER COLUMN user_id TYPE VARCHAR(255);
    """)
    print("   ✅ user_id changed to VARCHAR(255)")
    
    cursor.execute("""
        ALTER TABLE points_transactions
        ALTER COLUMN admin_id TYPE VARCHAR(255);
    """)
    print("   ✅ admin_id changed to VARCHAR(255)")
    
    cursor.execute("""
        ALTER TABLE transactions
        ALTER COLUMN user_id TYPE VARCHAR(255);
    """)
    print("   ✅ transactions.user_id changed to VARCHAR(255)")
    
    # Step 4: Re-enable RLS
    print("\nStep 4: Re-enabling Row-Level Security...")
    cursor.execute("ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;")
    print("   ✅ RLS re-enabled")
    
    # Commit
    conn.commit()
    print("\n✅ All fixes applied successfully!")
    print("   The points_transactions table now accepts Privy user IDs\n")
    
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    print("\nAttempting rollback...")
    try:
        conn.rollback()
    except:
        pass
    import traceback
    traceback.print_exc()
    exit(1)
