#!/bin/bash
# Clear all admin-created challenges

DATABASE_URL=$DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

echo "🔍 Checking admin-created challenges..."

# Count before deletion
COUNT=$(node -e "
  require('dotenv').config();
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  (async () => {
    try {
      await client.connect();
      const result = await client.query(
        'SELECT COUNT(*) as count FROM challenges WHERE admin_created = true'
      );
      console.log(result.rows[0].count);
    } finally {
      await client.end();
    }
  })();
" 2>/dev/null)

echo "📊 Admin-created challenges found: $COUNT"

if [ "$COUNT" -eq 0 ]; then
  echo "✅ No admin-created challenges to delete"
  exit 0
fi

echo "🗑️  Deleting $COUNT admin-created challenges..."

# Delete them
node -e "
  require('dotenv').config();
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  (async () => {
    try {
      await client.connect();
      const result = await client.query(
        'DELETE FROM challenges WHERE admin_created = true'
      );
      console.log('✅ Deleted ' + result.rowCount + ' admin-created challenges');
      
      // Verify
      const verify = await client.query(
        'SELECT COUNT(*) as count FROM challenges WHERE admin_created = true'
      );
      console.log('✅ Remaining admin-created challenges: ' + verify.rows[0].count);
    } finally {
      await client.end();
    }
  })();
"

echo "✅ Cleanup complete!"
