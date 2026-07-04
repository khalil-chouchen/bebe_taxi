#!/usr/bin/env node
/**
 * Detects the active LAN IPv4 address and writes it into apps/mobile/.env.
 * Run automatically via the "prestart" npm script.
 *
 * Requirements: Node.js built-in modules only (os, fs, path).
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// Paths relative to this script's location (apps/mobile/scripts/)
const MOBILE_ENV_PATH = path.join(__dirname, '..', '.env');
const BACKEND_ENV_PATH = path.join(__dirname, '..', '..', 'backend', '.env');

// Interface name substrings to skip (case-insensitive)
const SKIP_PATTERNS = [
  'vmware',
  'virtualbox',
  'vethernet',
  'docker',
  'wsl',
  'loopback',
  'hyper-v',
  'pseudo',
  'bluetooth',
  'teredo',
  'isatap',
  'tunnel',
];

function shouldSkipInterface(name) {
  const lower = name.toLowerCase();
  return SKIP_PATTERNS.some((p) => lower.includes(p));
}

function isPrivateLan(ip) {
  if (ip.startsWith('192.168.')) return 1; // highest priority
  if (ip.startsWith('10.')) return 2;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 3;
  return 0; // not a private LAN address
}

function detectLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    if (shouldSkipInterface(name)) continue;

    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;

      const priority = isPrivateLan(addr.address);
      if (priority === 0) continue; // skip non-private IPs (APIPA 169.254.x.x, etc.)

      candidates.push({ ip: addr.address, name, priority });
    }
  }

  if (candidates.length === 0) return null;

  // Sort: lower priority number = preferred
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const result = {};
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

function getBackendPort() {
  if (fs.existsSync(BACKEND_ENV_PATH)) {
    const vals = readEnvFile(BACKEND_ENV_PATH);
    if (vals.PORT) return vals.PORT;
  }
  return '3001';
}

// ── Main ──────────────────────────────────────────────────────────────────────

const detected = detectLanIp();

if (!detected) {
  console.error('');
  console.error('[update-env-ip] ERROR: Could not detect a LAN IP address.');
  console.error('[update-env-ip] Make sure your PC is connected to Wi-Fi or Ethernet.');
  console.error('[update-env-ip] Your phone and PC must be on the same network.');
  console.error('');
  process.exit(1);
}

const { ip, name } = detected;
const port = getBackendPort();
const apiUrl = `http://${ip}:${port}/api`;
const socketUrl = `http://${ip}:${port}`;

// Preserve existing values (e.g. GOOGLE_MAPS_API_KEY) from current .env
const existing = readEnvFile(MOBILE_ENV_PATH);
const googleMapsKey = existing.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const envContent =
  `EXPO_PUBLIC_API_URL=${apiUrl}\n` +
  `EXPO_PUBLIC_SOCKET_URL=${socketUrl}\n` +
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=${googleMapsKey}\n`;

fs.writeFileSync(MOBILE_ENV_PATH, envContent, 'utf8');

console.log('');
console.log('[update-env-ip] LAN IP detected successfully');
console.log(`  Interface  : ${name}`);
console.log(`  IP Address : ${ip}`);
console.log(`  Port       : ${port}`);
console.log(`  API URL    : ${apiUrl}`);
console.log(`  Socket URL : ${socketUrl}`);
if (googleMapsKey) {
  console.log(`  Maps Key   : ${googleMapsKey.slice(0, 8)}... (preserved)`);
} else {
  console.log('  Maps Key   : (not set — polyline will use straight-line fallback)');
}
console.log('');
