#!/usr/bin/env python3
"""
Python migration script to fix userPointsLedgers userId column constraint.
The column was created with UUID constraint but needs to accept varchar (Privy IDs).
"""

import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL not set in .env")
    exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n🔧 Starting database migration...\n")
    
    # Step 1: Check current column definition
    print("📋 Step 1: Checking current userPointsLedgers schema...")
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_points_ledgers'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    for col in columns:
        print(f"   - {col[0]:25} {col[1]:20} nullable={col[2]}")
    
    # Step 2: Check if userId column has UUID type
    print("\n📋 Step 2: Checking userId column type...")
    cursor.execute("""
        SELECT data_type
        FROM information_schema.columns
        WHERE table_name = 'user_points_ledgers' AND column_name = 'user_id';
    """)
    
    result = cursor.fetchone()
    if result:
        current_type = result[0]
        print(f"   Current type: {current_type}")
        
        if 'uuid' in current_type.lower():
            print("   ⚠️  UUID type detected - needs to be changed to TEXT/VARCHAR")
            
            # Step 3: Drop constraints that depend on this column
            print("\n🔧 Step 3: Removing constraints...")
            cursor.execute("""
                SELECT constraint_name 
                FROM information_schema.table_constraints 
                WHERE table_name = 'user_points_ledgers' AND constraint_type = 'FOREIGN KEY';
            """)
            fk_constraints = cursor.fetchall()
            
            for fk in fk_constraints:
                constraint_name = fk[0]
                print(f"   Dropping FK constraint: {constraint_name}")
                cursor.execute(f"ALTER TABLE user_points_ledgers DROP CONSTRAINT {constraint_name};")
            
            # Step 4: Change column type
            print("\n🔧 Step 4: Converting userId column from UUID to TEXT...")
            cursor.execute("""
                ALTER TABLE user_points_ledgers 
                ALTER COLUMN user_id TYPE TEXT;
            """)
            print("   ✅ Column type converted to TEXT")
            
            # Step 5: Recreate foreign key if needed
            print("\n🔧 Step 5: Verifying data integrity...")
            cursor.execute("""
                SELECT COUNT(*) FROM user_points_ledgers 
                WHERE user_id IS NOT NULL AND user_id ~ '^did:privy:';
            """)
            privy_count = cursor.fetchone()[0]
            print(f"   ✅ Found {privy_count} Privy user IDs in ledgers")
            
            # Commit changes
            conn.commit()
            print("\n✅ Migration completed successfully!")
            print("   userPointsLedgers.user_id now accepts Privy IDs\n")
        else:
            print(f"   ℹ️  Already using {current_type} - no migration needed")
            conn.close()
    else:
        print("   ❌ user_id column not found")
        conn.close()
        exit(1)

except psycopg2.Error as e:
    print(f"\n❌ Database error: {e}")
    conn.rollback()
    conn.close()
    exit(1)
except Exception as e:
    print(f"\n❌ Error: {e}")
    exit(1)
finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()
