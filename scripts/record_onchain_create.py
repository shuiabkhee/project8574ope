#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
TX_HASH = os.getenv('LAST_ONCHAIN_TX') or '0x81ff37d200ade57f9a2e028001c5a9c2041b3e71b58623eb0c1c46346dc1044c'
ONCHAIN_ID = os.getenv('LAST_ONCHAIN_ID') or '1'

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
    cur.execute("INSERT INTO users (id, email, password, username, first_name, created_at) VALUES (%s,%s,%s,%s,%s,now()) RETURNING id", (user_id, email, 'password', user_id, 'Onchain'))
    conn.commit()
    print('Created test user:', user_id)

# Create a challenge row representing the on-chain creation
title = 'On-chain Created Challenge'
amount = 0.0001
category = 'p2p'
zero_addr = '0x0000000000000000000000000000000000000000'
stake_amount_wei = int(amount * (10 ** 18))

insert_sql = """
INSERT INTO challenges (challenger, challenged, challenger_side, title, description, category, amount, status, admin_created, due_date, payment_token_address, stake_amount_wei, on_chain_status, creator_staked, acceptor_staked, creator_transaction_hash, blockchain_challenge_id, created_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, 'active', false, now() + interval '1 day', %s, %s, 'active', true, false, %s, %s, now())
RETURNING id, title, challenger, category, amount, status, creator_transaction_hash, created_at
"""

cur.execute(insert_sql, (user_id, None, 'YES', title, 'Inserted from on-chain tx', category, amount, zero_addr, stake_amount_wei, TX_HASH, ONCHAIN_ID))
conn.commit()
row = cur.fetchone()
print('\nInserted challenge row:')
print(row)

cur.close()
conn.close()
print('\nDone')
