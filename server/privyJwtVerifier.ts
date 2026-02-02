import jwt from 'jsonwebtoken';

/**
 * Verify a Privy-issued JWT using a provided public key (PEM).
 *
 * - If `PRIVY_PUBLIC_KEY` env var is set (PEM), this will verify the token
 *   locally and return decoded claims. Use algorithm ES256.
 * - Returns decoded payload on success or null on failure.
 */
export function verifyWithPublicKey(token: string) {
  const pub = process.env.PRIVY_PUBLIC_KEY;
  if (!pub) return null;

  try {
    const decoded = jwt.verify(token, pub, { algorithms: ['ES256'] });
    return decoded as any;
  } catch (err) {
    console.error('verifyWithPublicKey failed:', err?.message || err);
    return null;
  }
}

export default { verifyWithPublicKey };
