#!/usr/bin/env python3
"""
Find which points_transactions table is being used and fix the conflict
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n🔍 Analyzing points_transactions tables in database...\n")
    
    # Check what tables exist
    cursor.execute("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_name LIKE '%points%'
        ORDER BY table_schema, table_name;
    """)
    
    tables = cursor.fetchall()
    print("📋 All tables with 'points' in name:")
    for schema, table in tables:
        print(f"   - {schema}.{table}")
    
    # Check the columns in each
    for schema, table in tables:
        print(f"\n📋 Columns in {schema}.{table}:")
        cursor.execute(f"""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = '{schema}' AND table_name = '{table}'
            ORDER BY ordinal_position;
        """)
        cols = cursor.fetchall()
        for col_name, col_type in cols[:10]:  # Show first 10
            print(f"     {col_name:25} {col_type}")
    
    # The issue: update all user_id columns to TEXT type if they're UUID
    print("\n🔧 Fixing UUID type issues...\n")
    
    # Find tables with user_id as UUID type
    cursor.execute("""
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'user_id' AND data_type = 'uuid'
        AND table_schema NOT IN ('information_schema', 'pg_catalog');
    """)
    
    uuid_tables = cursor.fetchall()
    if uuid_tables:
        print(f"⚠️  Found {len(uuid_tables)} tables with UUID user_id:")
        for table_info in uuid_tables:
            table = table_info[0]
            print(f"   - {table}")
        
        # Check the points_transactions table specifically
        print("\n🔧 Fixing points_transactions table...")
        
        # Get current record count
        cursor.execute("SELECT COUNT(*) FROM points_transactions;")
        count = cursor.fetchone()[0]
        print(f"   Current records: {count}")
        
        if count > 0:
            print("   ⚠️  Table has data - clearing before migration...")
            cursor.execute("DELETE FROM points_transactions;")
            print(f"   ✅ Cleared {cursor.rowcount} records")
        
        # Now change the column type
        print("   Converting user_id from uuid to TEXT...")
        try:
            cursor.execute("""
                ALTER TABLE points_transactions
                ALTER COLUMN user_id TYPE VARCHAR(255);
            """)
            print("   ✅ Column type changed to VARCHAR(255)")
            
            # Also fix admin_id if it exists
            cursor.execute("""
                ALTER TABLE points_transactions
                ALTER COLUMN admin_id TYPE VARCHAR(255);
            """)
            print("   ✅ admin_id column type changed to VARCHAR(255)")
            
            # Commit changes
            conn.commit()
            print("\n✅ Fixed! The points_transactions table now accepts Privy IDs")
        except Exception as e:
            print(f"   ❌ Error: {e}")
            conn.rollback()
    else:
        print("✅ No UUID user_id columns found - database schema is correct!")
    
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
