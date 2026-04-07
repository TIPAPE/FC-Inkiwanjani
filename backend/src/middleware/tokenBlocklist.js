// backend/src/middleware/tokenBlocklist.js

const crypto = require('crypto');
const blocklist = new Set();

/**
 * Hashes a raw JWT with SHA-256.
 * We never store raw tokens — only their hashes.
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Adds a token to the blocklist and schedules its automatic removal.
 *
 * @param {string} token  - Raw JWT string
 * @param {number} [exp]  - Unix timestamp (seconds) from the decoded JWT payload.
 *                          If omitted, defaults to 7 days from now.
 */
const addToBlocklist = (token, exp) => {
  if (!token) return;

  const hash = hashToken(token);
  blocklist.add(hash);

  const msUntilExpiry = exp
    ? Math.max(0, exp * 1000 - Date.now())
    : 7 * 24 * 60 * 60 * 1000; // 7 days fallback

  // Clean up automatically — no manual pruning required
  setTimeout(() => blocklist.delete(hash), msUntilExpiry);

  console.log(
    `[tokenBlocklist] Token added. Blocklist size: ${blocklist.size}. ` +
    `Auto-removes in ${Math.round(msUntilExpiry / 1000)}s`
  );
};

/**
 * Returns true if the given raw token has been blocklisted.
 *
 * @param {string} token - Raw JWT string
 * @returns {boolean}
 */
const isBlocklisted = (token) => {
  if (!token) return false;
  return blocklist.has(hashToken(token));
};

/**
 * Returns the current number of blocklisted tokens.
 * Useful for health-check endpoints.
 */
const blocklistSize = () => blocklist.size;

module.exports = { addToBlocklist, isBlocklisted, blocklistSize };