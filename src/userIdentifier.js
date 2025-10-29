// /src/userIdentifier.js
// Utility to create unique user identifier from userName + code hash

/**
 * Generate a unique user identifier from userName and sharedCode
 * Format: "userName#hash8chars"
 * Example: "Alice#a3f2d9e1"
 */
export async function generateUserIdentifier(userName, sharedCode) {
  try {
    // Hash the shared code to get a consistent identifier
    const encoder = new TextEncoder();
    const data = encoder.encode(sharedCode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Take first 8 characters of hash
    const shortHash = hashHex.substring(0, 8);
    
    // Combine userName with hash
    const userIdentifier = `${userName}#${shortHash}`;
    
    return userIdentifier;
  } catch (error) {
    console.error('Error generating user identifier:', error);
    // Fallback: use simple hash
    let hash = 0;
    for (let i = 0; i < sharedCode.length; i++) {
      const char = sharedCode.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const shortHash = Math.abs(hash).toString(16).substring(0, 8).padStart(8, '0');
    return `${userName}#${shortHash}`;
  }
}

/**
 * Parse user identifier back into components
 * Returns { userName, hash } or null if invalid format
 */
export function parseUserIdentifier(userIdentifier) {
  if (!userIdentifier || typeof userIdentifier !== 'string') {
    return null;
  }
  
  const parts = userIdentifier.split('#');
  if (parts.length !== 2) {
    return null;
  }
  
  return {
    userName: parts[0],
    hash: parts[1]
  };
}

/**
 * Check if two user identifiers are the same person
 * (same name + same code hash)
 */
export function isSameUser(identifier1, identifier2) {
  if (!identifier1 || !identifier2) {
    return false;
  }
  return identifier1 === identifier2;
}

/**
 * Get display name from user identifier
 * "Alice#a3f2d9e1" -> "Alice"
 */
export function getDisplayName(userIdentifier) {
  const parsed = parseUserIdentifier(userIdentifier);
  return parsed ? parsed.userName : userIdentifier;
}
