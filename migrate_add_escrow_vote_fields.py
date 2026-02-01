#!/usr/bin/env python3
"""
Add missing Escrow & Vote fields to `challenges` table.

Run with: python migrate_add_escrow_vote_fields.py
"""
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ Missing DATABASE_URL in environment (.env)")
    sys.exit(1)

def connect():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ Connected to database")
        return conn
    except Exception as e:
        print(f"❌ DB connect failed: {e}")
        sys.exit(1)

def column_exists(cursor, table, column):
    cursor.execute("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    """, (table, column))
    return cursor.fetchone() is not None

def run():
    conn = connect()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    migrations = []

    checks = [
        ("settlement_type", "VARCHAR DEFAULT 'voting'"),
        ("creator_staked", "BOOLEAN DEFAULT FALSE"),
        ("acceptor_staked", "BOOLEAN DEFAULT FALSE"),
        ("creator_vote", "VARCHAR"),
        ("acceptor_vote", "VARCHAR"),
        ("creator_proof", "TEXT"),
        ("acceptor_proof", "TEXT"),
        ("dispute_reason", "TEXT"),
        ("voting_ends_at", "TIMESTAMP")
    ]

    try:
        for col, definition in checks:
            if not column_exists(cur, 'challenges', col):
                print(f"➕ Adding column: {col}")
                migrations.append(f"ALTER TABLE challenges ADD COLUMN {col} {definition};")
            else:
                print(f"✓ Column exists: {col}")

        if migrations:
            print(f"\n🚀 Applying {len(migrations)} migration(s)...\n")
            for i, sql in enumerate(migrations, 1):
                try:
                    print(f"  [{i}/{len(migrations)}] Executing...")
                    cur.execute(sql)
                    conn.commit()
                    print("    ✅ OK")
                except Exception as e:
                    print(f"    ❌ Failed: {e}")
                    conn.rollback()
            print("\n✅ Migrations complete")
        else:
            print("\n✅ No migrations needed; schema already contains escrow/vote fields.")

        # Optional: show current challenge columns for verification
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'challenges'
            ORDER BY ordinal_position
        """)
        cols = cur.fetchall()
        print("\n📋 challenges table columns:")
        for c in cols:
            print(f"  - {c['column_name']}: {c['data_type']} ({'NOT NULL' if c['is_nullable']=='NO' else 'NULL'})")

    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    print("🚀 Starting migration: add escrow & vote fields to challenges")
    run()
    print("\nNext: run backend updates to leverage these fields and create migrations/tests.")
