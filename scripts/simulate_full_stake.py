#!/usr/bin/env python3
from dotenv import load_dotenv
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime, timedelta

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print('DATABASE_URL not set')
    raise SystemExit(1)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

# Find a recent open challenge
cur.execute("SELECT id, challenger FROM challenges WHERE status='open' ORDER BY created_at DESC LIMIT 1")
challenge = cur.fetchone()
if not challenge:
    print('No open challenge found to simulate')
    cur.close()
    conn.close()
    raise SystemExit(1)

challenge_id = challenge['id']
creator_id = challenge['challenger']
print('Using challenge id', challenge_id, 'creator', creator_id)

# Find or create another user as acceptor
cur.execute("SELECT id FROM users WHERE id != %s LIMIT 1", (creator_id,))
row = cur.fetchone()
if row:
    acceptor_id = row['id']
    print('Using existing acceptor user:', acceptor_id)
else:
    acceptor_id = f'test-acceptor-{uuid.uuid4().hex[:8]}'
    email = f'{acceptor_id}@example.com'
    cur.execute("INSERT INTO users (id, email, password, username, first_name, created_at) VALUES (%s,%s,%s,%s,%s,now()) RETURNING id", (acceptor_id, email, 'password', acceptor_id, 'Acceptor'))
    conn.commit()
    print('Created acceptor user:', acceptor_id)

# Set creator transaction hash and mark creator staked
creator_tx = '0x' + uuid.uuid4().hex * 2
cur.execute("UPDATE challenges SET creator_transaction_hash=%s, creator_staked=true WHERE id=%s", (creator_tx, challenge_id))
conn.commit()
print('Set creator tx:', creator_tx)

# Simulate acceptor staking: set challenged, acceptorTransactionHash, acceptorStaked
acceptor_tx = '0x' + uuid.uuid4().hex * 2
voting_ends_at = datetime.utcnow() + timedelta(hours=1)
cur.execute(
    "UPDATE challenges SET challenged=%s, acceptor_transaction_hash=%s, acceptor_staked=true, status='active', on_chain_status='active', voting_ends_at=%s WHERE id=%s",
    (acceptor_id, acceptor_tx, voting_ends_at, challenge_id)
)
conn.commit()
print('Set acceptor:', acceptor_id, 'tx:', acceptor_tx)

# Fetch and print updated row
cur.execute("SELECT id, title, challenger, challenged, status, on_chain_status, creator_transaction_hash, acceptor_transaction_hash, voting_ends_at FROM challenges WHERE id=%s", (challenge_id,))
updated = cur.fetchone()
print('\nUpdated challenge row:')
print(updated)

cur.close()
conn.close()
print('\nDone')
