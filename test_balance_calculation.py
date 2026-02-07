#!/usr/bin/env python3
"""
Check pointsTransactions table structure and see if we can query it
"""

import os
import psycopg2
import json
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n🔍 Checking points_transactions table...\n")
    
    # Check pointsTransactions schema
    print("📋 points_transactions columns:")
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'points_transactions'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    for col in columns:
        print(f"   - {col[0]:25} {col[1]:20} nullable={col[2]}")
    
    # Test query
    test_user_id = "did:privy:cmk2cxona01r4jo0d5v22cqy4"
    
    print(f"\n🧪 Testing query for user {test_user_id[:30]}...")
    cursor.execute("""
        SELECT id, user_id, transaction_type, amount, created_at
        FROM points_transactions
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 5;
    """, (test_user_id,))
    
    rows = cursor.fetchall()
    print(f"   Found {len(rows)} transactions:")
    for row in rows[:5]:
        print(f"   - {row[1][:20]}... | {row[2]:20} | {row[3]} | {row[4]}")
    
    # Now try the updateUserPointsBalance-like query
    print(f"\n🧪 Testing calculateBalance query...")
    cursor.execute("""
        SELECT 
            transaction_type,
            amount
        FROM points_transactions
        WHERE user_id = %s;
    """, (test_user_id,))
    
    transactions = cursor.fetchall()
    print(f"   Found {len(transactions)} transactions for balance calculation")
    
    # Simulate updateUserPointsBalance calculation
    balance = 0
    for tx_type, amount in transactions:
        if tx_type in ['earned_challenge', 'creation_reward', 'joining_reward']:
            balance += amount
        elif tx_type in ['burned_usage']:
            balance -= amount
    
    print(f"   Calculated balance: {balance}")
    
    # Now try the actual update
    print(f"\n🧪 Testing UPDATE query...")
    try:
        cursor.execute("""
            UPDATE user_points_ledgers
            SET points_balance = %s,
                total_points_earned = %s,
                last_updated_at = NOW()
            WHERE user_id = %s;
        """, (balance, balance, test_user_id))
        
        print(f"   ✅ Update successful! Rows affected: {cursor.rowcount}")
        conn.rollback()  # Don't commit
    except Exception as e:
        print(f"   ❌ Update error: {e}")
    
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
