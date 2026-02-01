#!/usr/bin/env python3
"""
Migration: Add settlement tracking fields to challenges table
"""

import psycopg2
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

def run_migration():
    """Add settlement tracking fields"""
    
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not set")
        return
    
    # Parse DATABASE_URL
    if database_url.startswith('postgresql://'):
        parsed = urlparse(database_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip('/'),
            port=parsed.port or 5432
        )
    else:
        conn = psycopg2.connect(database_url)
    
    try:
        cursor = conn.cursor()
        migrations = [
            "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS stake_amount BIGINT DEFAULT 0;",
            "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS creator_released BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS acceptor_released BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS creator_hesitant BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS acceptor_hesitant BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS creator_released_at TIMESTAMP DEFAULT NULL;",
            "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS acceptor_released_at TIMESTAMP DEFAULT NULL;",
        ]
        
        print("\n🔄 Running migrations...\n")
        for i, migration in enumerate(migrations, 1):
            try:
                cursor.execute(migration)
                conn.commit()
                print(f"✅ Migration {i}: Success")
            except psycopg2.Error as e:
                if 'already' in str(e).lower():
                    print(f"⏭️  Migration {i}: Already applied")
                else:
                    print(f"❌ Migration {i}: {str(e)}")
                    conn.rollback()
        
        print("\n✅ All migrations completed!")
        
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'challenges' 
            AND column_name IN ('stake_amount','creator_released','acceptor_released',
                                'creator_hesitant','acceptor_hesitant','creator_released_at','acceptor_released_at')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        if columns:
            print("\n📋 Added columns:\n")
            for col_name, data_type in columns:
                print(f"   - {col_name} ({data_type})")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    run_migration()
    
    try:
        cursor = conn.cursor()
        
        migrations = [
            # Add stakeAmount column (duplicates stakeAmountWei but human-readable)
            """
            ALTER TABLE challenges 
            ADD COLUMN IF NOT EXISTS stake_amount BIGINT DEFAULT 0;
            """,
            
            # Add release status fields
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS creator_released BOOLEAN DEFAULT FALSE;
            """,
            
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS acceptor_released BOOLEAN DEFAULT FALSE;
            """,
            
            # Add hesitant flags (when both proofs submitted but party hasn't released)
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS creator_hesitant BOOLEAN DEFAULT FALSE;
            """,
            
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS acceptor_hesitant BOOLEAN DEFAULT FALSE;
            """,
            
            # Track when funds were released
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS creator_released_at TIMESTAMP DEFAULT NULL;
            """,
            
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS acceptor_released_at TIMESTAMP DEFAULT NULL;
            """,
        ]
        
        print("\n🔄 Running migrations...\n")
        
        for i, migration in enumerate(migrations, 1):
            try:
                cursor.execute(migration)
                conn.commit()
                print(f"✅ Migration {i}: Success")
            except psycopg2.Error as e:
                if 'already' in str(e).lower() or 'exists' in str(e).lower():
                    print(f"⏭️  Migration {i}: Already applied")
                else:
                    print(f"❌ Migration {i}: {str(e)}")
                    conn.rollback()
        
        print("\n✅ All migrations completed!")
        
        # Verify columns exist
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'challenges' 
            AND column_name IN (
                'stake_amount',
                'creator_released',
                'acceptor_released',
                'creator_hesitant',
                'acceptor_hesitant',
                'creator_released_at',
                'acceptor_released_at'
            )
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        if columns:
            print("\n📋 Added columns:\n")
            for col_name, data_type in columns:
                print(f"   - {col_name} ({data_type})")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()
    
    try:
        cursor = conn.cursor()
        
        migrations = [
            # Add stakeAmount column (duplicates stakeAmountWei but human-readable)
            """
            ALTER TABLE challenges 
            ADD COLUMN IF NOT EXISTS stake_amount BIGINT DEFAULT 0;
            """,
            
            # Add release status fields
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS creator_released BOOLEAN DEFAULT FALSE;
            """,
            
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS acceptor_released BOOLEAN DEFAULT FALSE;
            """,
            
            # Add hesitant flags (when both proofs submitted but party hasn't released)
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS creator_hesitant BOOLEAN DEFAULT FALSE;
            """,
            
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS acceptor_hesitant BOOLEAN DEFAULT FALSE;
            """,
            
            # Track when funds were released
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS creator_released_at TIMESTAMP DEFAULT NULL;
            """,
            
            """
            ALTER TABLE challenges
            ADD COLUMN IF NOT EXISTS acceptor_released_at TIMESTAMP DEFAULT NULL;
            """,
        ]
        
        print("\n🔄 Running migrations...\n")
        
        for i, migration in enumerate(migrations, 1):
            try:
                cursor.execute(migration)
                conn.commit()
                print(f"✅ Migration {i}: Success")
            except psycopg2.Error as e:
                if 'already' in str(e).lower() or 'exists' in str(e).lower():
                    print(f"⏭️  Migration {i}: Already applied")
                else:
                    print(f"❌ Migration {i}: {str(e)}")
                    conn.rollback()
        
        print("\n✅ All migrations completed!")
        
        # Verify columns exist
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'challenges' 
            AND column_name IN (
                'stake_amount',
                'creator_released',
                'acceptor_released',
                'creator_hesitant',
                'acceptor_hesitant',
                'creator_released_at',
                'acceptor_released_at'
            )
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        if columns:
            print("\n📋 Added columns:\n")
            for col_name, data_type in columns:
                print(f"   - {col_name} ({data_type})")
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()
