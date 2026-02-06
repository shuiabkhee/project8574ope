#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print('DATABASE_URL not set')
    raise SystemExit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Try to pick an existing user
cur.execute("SELECT id FROM users LIMIT 1")
row = cur.fetchone()
if row:
    user_id = row['id']
    print('Using existing user:', user_id)
else:
    # Create a test user
    user_id = f'test-user-{uuid.uuid4().hex[:8]}'
    email = f'{user_id}@example.com'
    cur.execute("INSERT INTO users (id, email, password, username, first_name, created_at) VALUES (%s,%s,%s,%s,%s,now()) RETURNING id", (user_id, email, 'password', user_id, 'Test'))
    conn.commit()
    print('Created test user:', user_id)

# Insert a challenge
title = 'Test Inserted Challenge'
amount = 5
category = 'p2p'

insert_sql = """
INSERT INTO challenges (challenger, challenged, challenger_side, title, description, category, amount, status, admin_created, due_date, payment_token_address, stake_amount_wei, on_chain_status, creator_staked, acceptor_staked)
VALUES (%s, %s, %s, %s, %s, %s, %s, 'open', false, now() + interval '1 day', %s, %s, 'pending', false, false)
RETURNING id, title, challenger, category, amount, status, creator_transaction_hash, acceptor_transaction_hash, created_at
"""

# Use zero address for payment token and calculate stake_amount_wei
zero_addr = '0x0000000000000000000000000000000000000000'
stake_amount_wei = int(5 * (10 ** 18))
cur.execute(insert_sql, (user_id, None, 'YES', title, 'Inserted by test script', category, amount, zero_addr, stake_amount_wei))
conn.commit()
row = cur.fetchone()
print('\nInserted challenge row:')
print(row)

cur.close()
conn.close()
print('\nDone')
