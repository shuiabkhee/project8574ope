#!/usr/bin/env python3
"""
Migrate old points_transactions table to use bigint for amount
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n🔧 Fixing points_transactions table amount column...\n")
    
    # Check current column type
    cursor.execute("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'points_transactions' AND column_name = 'amount';
    """)
    result = cursor.fetchone()
    current_type = result[0] if result else "UNKNOWN"
    print(f"📋 Current amount column type: {current_type}")
    
    if current_type == 'integer':
        print("\n⚠️  Amount column is INTEGER - converting to BIGINT...")
        
        # Check record count
        cursor.execute("SELECT COUNT(*) FROM points_transactions;")
        count = cursor.fetchone()[0]
        print(f"   Records in table: {count}")
        
        # Convert column type
        cursor.execute("""
            ALTER TABLE points_transactions
            ALTER COLUMN amount TYPE bigint;
        """)
        print("   ✅ Column type changed to BIGINT")
        
        # Commit
        conn.commit()
        print("\n✅ Migration complete! points_transactions.amount now uses BIGINT\n")
    else:
        print(f"✅ Amount column is already {current_type} - no migration needed\n")
    
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    try:
        conn.rollback()
    except:
        pass
    import traceback
    traceback.print_exc()
    exit(1)
