import * as https from 'https';

// ============================================================================
// OSV.dev API Client with In-Memory Cache
// ============================================================================

interface OsvVulnerability {
  id: string;
  summary: string;
  details: string;
  severity: { type: string; score: string }[];
  affected: {
    package: { name: string; ecosystem: string };
    ranges: { type: string; events: { introduced?: string; fixed?: string }[] }[];
  }[];
  references: { type: string; url: string }[];
}

interface OsvQueryResult {
  vulns: OsvVulnerability[];
}

interface CacheEntry {
  data: OsvVulnerability[];
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache: Map<string, CacheEntry> = new Map();

/**
 * Query the OSV.dev API for vulnerabilities affecting a specific package version.
 */
export async function queryOsv(
  packageName: string,
  version: string,
  ecosystem: string
): Promise<OsvVulnerability[]> {
  const cacheKey = `${ecosystem}:${packageName}@${version}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const body = JSON.stringify({
    package: { name: packageName, ecosystem },
    version,
  });

  try {
    const result = await httpPost('https://api.osv.dev/v1/query', body);
    const parsed: OsvQueryResult = JSON.parse(result);
    const vulns = parsed.vulns || [];

    // Cache the result
    cache.set(cacheKey, { data: vulns, timestamp: Date.now() });
    return vulns;
  } catch (err) {
    console.error(`[RippleGuard] OSV query failed for ${cacheKey}:`, err);
    return [];
  }
}

/**
 * Extract the minimum fixed version from an OSV vulnerability record.
 */
export function getFixVersion(vuln: OsvVulnerability): string | null {
  for (const affected of vuln.affected || []) {
    for (const range of affected.ranges || []) {
      for (const event of range.events || []) {
        if (event.fixed) {
          return event.fixed;
        }
      }
    }
  }
  return null;
}

/**
 * Get the highest severity score from a vulnerability.
 */
export function getSeverityScore(vuln: OsvVulnerability): number {
  for (const s of vuln.severity || []) {
    const score = parseFloat(s.score);
    if (!isNaN(score)) { return score; }
  }
  return 0;
}

/**
 * Classify severity into human-readable labels.
 */
export function getSeverityLabel(score: number): string {
  if (score >= 9.0) { return 'Critical'; }
  if (score >= 7.0) { return 'High'; }
  if (score >= 4.0) { return 'Medium'; }
  if (score > 0) { return 'Low'; }
  return 'Unknown';
}

// ============================================================================
// HTTP Helper (native Node.js, no external deps)
// ============================================================================

function httpPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
