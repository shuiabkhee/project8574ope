#!/usr/bin/env python3
"""
Diagnostic script to find UUID constraints in userPointsLedgers
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n🔍 Finding UUID constraints and issues...\n")
    
    # Check constraints
    print("📋 Constraints on user_points_ledgers:")
    cursor.execute("""
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'user_points_ledgers'
        ORDER BY constraint_type;
    """)
    constraints = cursor.fetchall()
    for c in constraints:
        print(f"   - {c[0]} ({c[1]})")
    
    # Check indexes
    print("\n📋 Indexes on user_points_ledgers:")
    cursor.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'user_points_ledgers';
    """)
    indexes = cursor.fetchall()
    for idx in indexes:
        print(f"   - {idx[0]}")
        print(f"     {idx[1][:80]}...")
    
    # Try inserting a test record to see the actual error
    print("\n🧪 Testing insert with Privy ID...")
    test_user_id = "did:privy:cmk2cxona01r4jo0d5v22cqy4"
    try:
        cursor.execute("""
            SELECT 1 FROM user_points_ledgers 
            WHERE user_id = %s 
            LIMIT 1;
        """, (test_user_id,))
        result = cursor.fetchone()
        print(f"   ✅ Query works! Found: {result}")
    except Exception as e:
        print(f"   ❌ Query error: {e}")
    
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
