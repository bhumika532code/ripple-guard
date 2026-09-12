"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryOsv = queryOsv;
exports.getFixVersion = getFixVersion;
exports.getSeverityScore = getSeverityScore;
exports.getSeverityLabel = getSeverityLabel;
const https = __importStar(require("https"));
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map();
/**
 * Query the OSV.dev API for vulnerabilities affecting a specific package version.
 */
async function queryOsv(packageName, version, ecosystem) {
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
        const parsed = JSON.parse(result);
        const vulns = parsed.vulns || [];
        // Cache the result
        cache.set(cacheKey, { data: vulns, timestamp: Date.now() });
        return vulns;
    }
    catch (err) {
        console.error(`[WebNode] OSV query failed for ${cacheKey}:`, err);
        return [];
    }
}
/**
 * Extract the minimum fixed version from an OSV vulnerability record.
 */
function getFixVersion(vuln) {
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
function getSeverityScore(vuln) {
    for (const s of vuln.severity || []) {
        const score = parseFloat(s.score);
        if (!isNaN(score)) {
            return score;
        }
    }
    return 0;
}
/**
 * Classify severity into human-readable labels.
 */
function getSeverityLabel(score) {
    if (score >= 9.0) {
        return 'Critical';
    }
    if (score >= 7.0) {
        return 'High';
    }
    if (score >= 4.0) {
        return 'Medium';
    }
    if (score > 0) {
        return 'Low';
    }
    return 'Unknown';
}
// ============================================================================
// HTTP Helper (native Node.js, no external deps)
// ============================================================================
function httpPost(url, body) {
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
//# sourceMappingURL=osvClient.js.map