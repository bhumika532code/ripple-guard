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
exports.detectEcosystem = detectEcosystem;
exports.parseManifest = parseManifest;
exports.scanManifest = scanManifest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const osvClient_1 = require("./osvClient");
/**
 * Detect the ecosystem from a file path.
 */
function detectEcosystem(filePath) {
    const base = path.basename(filePath).toLowerCase();
    if (base === 'package.json' || base === 'package-lock.json') {
        return 'npm';
    }
    if (base === 'requirements.txt' || base === 'pipfile' || base === 'setup.py' || base === 'pyproject.toml') {
        return 'PyPI';
    }
    if (base === 'pom.xml' || base === 'build.gradle' || base === 'build.gradle.kts') {
        return 'Maven';
    }
    if (base === 'go.mod' || base === 'go.sum') {
        return 'Go';
    }
    if (base === 'cargo.toml' || base === 'cargo.lock') {
        return 'crates.io';
    }
    if (base === 'gemfile' || base === 'gemfile.lock') {
        return 'RubyGems';
    }
    if (base === 'composer.json' || base === 'composer.lock') {
        return 'Packagist';
    }
    if (base === 'pubspec.yaml' || base === 'pubspec.lock') {
        return 'Pub';
    }
    if (base === 'packages.config' || base.endsWith('.csproj') || base.endsWith('.fsproj')) {
        return 'NuGet';
    }
    return null;
}
/**
 * Parse a manifest file and extract all dependencies.
 */
function parseManifest(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const base = path.basename(filePath).toLowerCase();
    if (base === 'package.json') {
        return parsePackageJson(content);
    }
    if (base === 'requirements.txt') {
        return parseRequirementsTxt(content);
    }
    if (base === 'pom.xml') {
        return parsePomXml(content);
    }
    return [];
}
/**
 * Parse npm package.json
 */
function parsePackageJson(content) {
    const packages = [];
    const lines = content.split('\n');
    try {
        const json = JSON.parse(content);
        const allDeps = {
            ...(json.dependencies || {}),
            ...(json.devDependencies || {}),
        };
        for (const [name, versionRaw] of Object.entries(allDeps)) {
            // Clean version string (remove ^, ~, >=, etc.)
            const version = versionRaw.replace(/^[\^~>=<]*/, '');
            // Find the line number
            let lineNum = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(`"${name}"`)) {
                    lineNum = i;
                    break;
                }
            }
            packages.push({
                name,
                version,
                ecosystem: 'npm',
                line: lineNum,
                lineText: lines[lineNum] || '',
            });
        }
    }
    catch (e) {
        console.error('[RippleGuard] Failed to parse package.json:', e);
    }
    return packages;
}
/**
 * Parse Python requirements.txt
 */
function parseRequirementsTxt(content) {
    const packages = [];
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) {
            return;
        }
        // Match patterns: package==1.0.0, package>=1.0.0, package~=1.0.0
        const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*(?:[=~<>!]+)\s*([0-9a-zA-Z._-]+)/);
        if (match) {
            packages.push({
                name: match[1],
                version: match[2],
                ecosystem: 'PyPI',
                line: index,
                lineText: line,
            });
        }
        else if (/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
            // Package without version
            packages.push({
                name: trimmed,
                version: 'latest',
                ecosystem: 'PyPI',
                line: index,
                lineText: line,
            });
        }
    });
    return packages;
}
/**
 * Parse Java pom.xml (basic regex extraction)
 */
function parsePomXml(content) {
    const packages = [];
    const lines = content.split('\n');
    const depRegex = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<version>(.*?)<\/version>[\s\S]*?<\/dependency>/g;
    let match;
    while ((match = depRegex.exec(content)) !== null) {
        const name = `${match[1]}:${match[2]}`;
        const version = match[3];
        // Find the approximate line number
        const charIndex = match.index;
        const lineNum = content.substring(0, charIndex).split('\n').length - 1;
        packages.push({
            name,
            version,
            ecosystem: 'Maven',
            line: lineNum,
            lineText: lines[lineNum] || '',
        });
    }
    return packages;
}
/**
 * Full scan: parse a manifest and check every dependency for vulnerabilities.
 */
async function scanManifest(filePath) {
    const ecosystem = detectEcosystem(filePath) || 'npm';
    const packages = parseManifest(filePath);
    const vulnerabilities = [];
    for (const pkg of packages) {
        if (pkg.version === 'latest') {
            continue;
        }
        const vulns = await (0, osvClient_1.queryOsv)(pkg.name, pkg.version, pkg.ecosystem);
        if (vulns.length > 0) {
            let highestScore = 0;
            const ids = [];
            const summaries = [];
            let bestFix = null;
            for (const v of vulns) {
                ids.push(v.id);
                summaries.push(v.summary || v.details || 'No description available');
                const score = (0, osvClient_1.getSeverityScore)(v);
                if (score > highestScore) {
                    highestScore = score;
                }
                const fix = (0, osvClient_1.getFixVersion)(v);
                if (fix) {
                    bestFix = fix;
                }
            }
            vulnerabilities.push({
                package: pkg,
                vulnCount: vulns.length,
                vulnIds: ids,
                highestSeverity: highestScore,
                severityLabel: (0, osvClient_1.getSeverityLabel)(highestScore),
                fixVersion: bestFix,
                summaries,
            });
        }
    }
    return {
        filePath,
        ecosystem,
        packages,
        vulnerabilities,
        safeCount: packages.length - vulnerabilities.length,
        totalCount: packages.length,
    };
}
//# sourceMappingURL=scanner.js.map