import * as os from 'os';

interface NetworkAddress {
  ip: string;
  name: string;
}

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

function isPrivateLan(ip: string): number {
  if (ip.startsWith('192.168.')) return 1;
  if (ip.startsWith('10.')) return 2;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 3;
  return 0;
}

export function detectLanIp(): NetworkAddress | null {
  const interfaces = os.networkInterfaces();
  const candidates: Array<NetworkAddress & { priority: number }> = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    const lower = name.toLowerCase();
    if (SKIP_PATTERNS.some((p) => lower.includes(p))) continue;

    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const priority = isPrivateLan(addr.address);
      if (priority === 0) continue;
      candidates.push({ ip: addr.address, name, priority });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  return { ip: candidates[0].ip, name: candidates[0].name };
}

export function printNetworkInfo(port: number): void {
  const lan = detectLanIp();
  console.log(`   Backend running locally : http://localhost:${port}`);
  if (lan) {
    console.log(`   Backend running on LAN  : http://${lan.ip}:${port}`);
    console.log(`   (set EXPO_PUBLIC_API_URL=http://${lan.ip}:${port}/api in apps/mobile/.env)`);
  } else {
    console.log('   Backend running on LAN  : (no LAN interface detected)');
  }
}
