#!/usr/bin/env python3
"""
Check if there's a foreign key constraint causing UUID issues
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n🔍 Checking foreign keys and user ID types...\n")
    
    # Check users table ID type
    print("📋 Users table id column type:")
    cursor.execute("""
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id';
    """)
    result = cursor.fetchone()
    if result:
        print(f"   Type: {result[0]}")
    
    # Check if there's a foreign key from user_points_ledgers to users
    print("\n📋 Foreign keys on user_points_ledgers:")
    cursor.execute("""
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'user_points_ledgers' AND tc.constraint_type = 'FOREIGN KEY';
    """)
    
    fks = cursor.fetchall()
    if fks:
        for fk in fks:
            print(f"   - {fk[0]}: {fk[1]} -> {fk[2]}.{fk[3]}")
    else:
        print("   (No foreign keys found)")
    
    # Check the actual error by trying the query that fails
    print("\n🧪 Testing ensureUserPointsLedger operation...")
    test_user_id = "did:privy:cmk2cxona01r4jo0d5v22cqy4"
    
    try:
        # Step 1: Check if ledger exists
        cursor.execute("""
            SELECT * FROM user_points_ledgers 
            WHERE user_id = %s
            LIMIT 1;
        """, (test_user_id,))
        existing = cursor.fetchone()
        print(f"   Ledger exists: {existing is not None}")
        
        if not existing:
            # Step 2: Try to insert
            print(f"   Attempting to create ledger for {test_user_id}...")
            cursor.execute("""
                INSERT INTO user_points_ledgers 
                (user_id, points_balance, total_points_earned, total_points_burned, points_locked_in_escrow)
                VALUES (%s, 0, 0, 0, 0)
                RETURNING *;
            """, (test_user_id,))
            new_ledger = cursor.fetchone()
            print(f"   ✅ Insert successful! ID: {new_ledger[0]}")
            conn.rollback()  # Don't actually commit test insert
        else:
            print(f"   ✅ Ledger already exists")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print(f"   Error type: {type(e).__name__}")
    
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
