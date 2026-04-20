// Run with: node scripts/mega-session.js
// Extracts MEGA session ID + root handle, prints env vars to add to .env
// Uses megajs (Node.js only) — run on dev machine, not on device
const { Storage } = require('megajs');
require('dotenv').config();

const email = process.env.EXPO_PUBLIC_MEGA_EMAIL;
const password = process.env.EXPO_PUBLIC_MEGA_PASSWORD;

if (!email || !password) {
  console.error('Set EXPO_PUBLIC_MEGA_EMAIL and EXPO_PUBLIC_MEGA_PASSWORD in .env');
  process.exit(1);
}

console.log('Logging into MEGA as', email, '...');

const storage = new Storage({ email, password }, (err) => {
  if (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
  }

  const sid = storage.api.sid;
  const masterKey = storage.key.toString('base64');
  const rootId = storage.root?.nodeId;

  console.log('\n# Add these to .env:');
  console.log('EXPO_PUBLIC_MEGA_SID=' + sid);
  console.log('EXPO_PUBLIC_MEGA_MASTER_KEY=' + masterKey);
  console.log('EXPO_PUBLIC_MEGA_ROOT=' + rootId);
  console.log('\nSession extracted. App will use these directly — no PBKDF2 or RSA on device.');

  storage.close();
  process.exit(0);
});
