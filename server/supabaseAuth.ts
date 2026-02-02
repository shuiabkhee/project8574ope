import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Decode the JWT_SECRET from base64 (Supabase format)
// Return a Buffer for base64 secrets (better for binary secrets) or string otherwise
function getJwtSecret(): Buffer | string {
  let envSecret = (process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production').trim();
  // Strip surrounding quotes if present
  envSecret = envSecret.replace(/^"|"$/g, '');

  // Detect base64-like strings (common for Supabase JWT secrets)
  const base64Like = /^[A-Za-z0-9+/]+={0,2}$/.test(envSecret) && envSecret.length >= 32;

  if (base64Like) {
    // Legacy supabaseAuth module removed. Functionality migrated into `privyAuth.ts`.
    // Keep a minimal stub to fail fast if accidentally imported.
    console.warn('server/supabaseAuth.ts is deprecated. Use server/privyAuth.ts exports instead.');
    export const deprecated = true;
        console.log('✅ Using base64-decoded JWT_SECRET (Buffer)');
