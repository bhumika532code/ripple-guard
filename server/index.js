const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Configure multer for file uploads (10 MB limit)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

// ==========================================================================
// PARSERS: Each returns { ecosystem: string, deps: string[] }
// ==========================================================================

function parsePackageJson(content) {
  const pkg = JSON.parse(content);
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.peerDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  };
  return { ecosystem: 'npm', appName: pkg.name || 'npm-project', deps: Object.keys(deps), versions: deps };
}

function parseRequirementsTxt(content) {
  const deps = [];
  const versions = {};
  content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('-')).forEach(l => {
    const parts = l.split(/[=<>!~;\[]/);
    const name = parts[0].trim();
    if (name) {
      deps.push(name);
      const verMatch = l.match(/[=<>!~]+(.*)/);
      if (verMatch) versions[name] = verMatch[1].trim().split(';')[0].split('#')[0].trim();
    }
  });
  return { ecosystem: 'PyPI', appName: 'python-project', deps: [...new Set(deps)], versions };
}

function parsePipfile(content) {
  // Simple Pipfile parser — grab lines under [packages] and [dev-packages]
  const deps = [];
  let inSection = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (/^\[(packages|dev-packages)\]$/i.test(trimmed)) {
      inSection = true;
      continue;
    }
    if (trimmed.startsWith('[')) {
      inSection = false;
      continue;
    }
    if (inSection && trimmed && !trimmed.startsWith('#')) {
      const name = trimmed.split('=')[0].replace(/['"]/g, '').trim();
      if (name) deps.push(name);
    }
  }
  return { ecosystem: 'PyPI', appName: 'python-project', deps: [...new Set(deps)] };
}

function parsePyprojectToml(content) {
  // Best-effort parsing of pyproject.toml dependencies
  const deps = [];
  const depRegex = /["']([a-zA-Z0-9_-]+(?:\[[^\]]*\])?)\s*[><=!~;]*/g;
  // Look for dependencies sections
  let inDeps = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (/^\[.*dependencies.*\]/i.test(trimmed) || /^dependencies\s*=/i.test(trimmed)) {
      inDeps = true;
      continue;
    }
    if (trimmed.startsWith('[') && inDeps) {
      inDeps = false;
    }
    if (inDeps) {
      let m;
      while ((m = depRegex.exec(trimmed)) !== null) {
        const name = m[1].split('[')[0];
        if (name) deps.push(name);
      }
    }
  }
  // Also catch requires = [...] patterns
  const requiresMatch = content.match(/requires\s*=\s*\[([\s\S]*?)\]/g);
  if (requiresMatch) {
    for (const block of requiresMatch) {
      let m;
      const r = /["']([a-zA-Z0-9_-]+)/g;
      while ((m = r.exec(block)) !== null) {
        deps.push(m[1]);
      }
    }
  }
  return { ecosystem: 'PyPI', appName: 'python-project', deps: [...new Set(deps)] };
}

function parsePomXml(content) {
  const deps = [];
  const versions = {};
  const depRegex = /<dependency>\s*([\s\S]*?)<\/dependency>/g;
  let match;
  while ((match = depRegex.exec(content)) !== null) {
    const block = match[1];
    const groupId = (block.match(/<groupId>(.*?)<\/groupId>/) || [])[1];
    const artifactId = (block.match(/<artifactId>(.*?)<\/artifactId>/) || [])[1];
    const version = (block.match(/<version>(.*?)<\/version>/) || [])[1];
    if (groupId && artifactId) {
      const name = `${groupId}:${artifactId}`;
      deps.push(name);
      if (version) versions[name] = version.replace(/\$\{.*?\}/, '').trim();
    } else if (artifactId) {
      deps.push(artifactId);
    }
  }
  const nameMatch = content.match(/<artifactId>(.*?)<\/artifactId>/);
  return { ecosystem: 'Maven', appName: nameMatch ? nameMatch[1] : 'maven-project', deps: [...new Set(deps)], versions };
}

function parseBuildGradle(content) {
  // Match lines like: implementation 'group:artifact:version'
  const deps = [];
  const patterns = [
    /(?:implementation|api|compile|compileOnly|runtimeOnly|testImplementation|testCompile|classpath)\s+['"]([^'"]+)['"]/g,
    /(?:implementation|api|compile|compileOnly|runtimeOnly|testImplementation|testCompile|classpath)\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const regex of patterns) {
    let m;
    while ((m = regex.exec(content)) !== null) {
      const parts = m[1].split(':');
      if (parts.length >= 2) {
        deps.push(`${parts[0]}:${parts[1]}`);
      }
    }
  }
  return { ecosystem: 'Maven', appName: 'gradle-project', deps: [...new Set(deps)] };
}

function parseGemfile(content) {
  const deps = [];
  const gemRegex = /^\s*gem\s+['"]([^'"]+)['"]/gm;
  let m;
  while ((m = gemRegex.exec(content)) !== null) {
    deps.push(m[1]);
  }
  return { ecosystem: 'RubyGems', appName: 'ruby-project', deps: [...new Set(deps)] };
}

function parseGoMod(content) {
  const deps = [];
  let inRequire = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('require (') || trimmed === 'require (') {
      inRequire = true;
      continue;
    }
    if (trimmed === ')') {
      inRequire = false;
      continue;
    }
    if (inRequire && trimmed && !trimmed.startsWith('//')) {
      const parts = trimmed.split(/\s+/);
      if (parts[0]) deps.push(parts[0]);
    }
    // Single-line require
    const singleMatch = trimmed.match(/^require\s+(\S+)\s+/);
    if (singleMatch) deps.push(singleMatch[1]);
  }
  const moduleMatch = content.match(/^module\s+(\S+)/m);
  return { ecosystem: 'Go', appName: moduleMatch ? moduleMatch[1] : 'go-project', deps: [...new Set(deps)] };
}

function parseCargoToml(content) {
  const deps = [];
  let inDeps = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (/^\[(.*dependencies.*)\]$/i.test(trimmed)) {
      inDeps = true;
      continue;
    }
    if (trimmed.startsWith('[')) {
      inDeps = false;
      continue;
    }
    if (inDeps && trimmed && !trimmed.startsWith('#')) {
      const name = trimmed.split('=')[0].trim();
      if (name) deps.push(name);
    }
  }
  const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
  return { ecosystem: 'crates.io', appName: nameMatch ? nameMatch[1] : 'rust-project', deps: [...new Set(deps)] };
}

function parseComposerJson(content) {
  const pkg = JSON.parse(content);
  const deps = {
    ...(pkg.require || {}),
    ...(pkg['require-dev'] || {}),
  };
  // Filter out php, ext-* entries
  const filtered = Object.keys(deps).filter(d => !d.startsWith('ext-') && d !== 'php');
  return { ecosystem: 'Packagist', appName: pkg.name || 'php-project', deps: filtered };
}

function parsePubspecYaml(content) {
  const deps = [];
  let inDeps = false;
  for (const line of content.split('\n')) {
    if (/^(dependencies|dev_dependencies)\s*:/.test(line)) {
      inDeps = true;
      continue;
    }
    if (/^\S/.test(line) && inDeps) {
      inDeps = false;
      continue;
    }
    if (inDeps) {
      const m = line.match(/^\s+([a-zA-Z0-9_]+)\s*:/);
      if (m && m[1] !== 'sdk' && m[1] !== 'flutter') {
        deps.push(m[1]);
      }
    }
  }
  const nameMatch = content.match(/^name\s*:\s*(\S+)/m);
  return { ecosystem: 'Pub', appName: nameMatch ? nameMatch[1] : 'dart-project', deps: [...new Set(deps)] };
}

function parsePackageSwift(content) {
  // Extract .package(url: "...repo...", ...) — use the last path component as the name
  const deps = [];
  const pkgRegex = /\.package\s*\(\s*url\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = pkgRegex.exec(content)) !== null) {
    const url = m[1];
    const name = url.split('/').pop().replace(/\.git$/, '');
    if (name) deps.push(name);
  }
  return { ecosystem: 'SwiftURL', appName: 'swift-project', deps: [...new Set(deps)] };
}

function parseCsproj(content) {
  // .NET: <PackageReference Include="Name" Version="..." />
  const deps = [];
  const regex = /<PackageReference\s+Include="([^"]+)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    deps.push(m[1]);
  }
  return { ecosystem: 'NuGet', appName: 'dotnet-project', deps: [...new Set(deps)] };
}

function parsePackagesConfig(content) {
  // .NET (legacy): <package id="Name" version="..." />
  const deps = [];
  const regex = /<package\s+id="([^"]+)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    deps.push(m[1]);
  }
  return { ecosystem: 'NuGet', appName: 'dotnet-project', deps: [...new Set(deps)] };
}

function parsePackageLockJson(content) {
  const pkg = JSON.parse(content);
  const deps = [];
  // npm lockfile v2/v3 uses "packages" key
  if (pkg.packages) {
    for (const key of Object.keys(pkg.packages)) {
      if (key && key !== '') {
        const name = key.replace(/^node_modules\//, '');
        if (!name.includes('node_modules/')) deps.push(name);
      }
    }
  }
  // npm lockfile v1 uses "dependencies" key
  if (pkg.dependencies) {
    for (const key of Object.keys(pkg.dependencies)) {
      if (!deps.includes(key)) deps.push(key);
    }
  }
  return { ecosystem: 'npm', appName: pkg.name || 'npm-project', deps: [...new Set(deps)] };
}

function parseYarnLock(content) {
  // Extract package names from yarn.lock
  const deps = [];
  const regex = /^"?(@?[^@\s"]+)/gm;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const name = m[1].replace(/:$/, '');
    if (name && !name.startsWith('#') && !deps.includes(name)) {
      deps.push(name);
    }
  }
  return { ecosystem: 'npm', appName: 'npm-project', deps: [...new Set(deps.slice(0, 100))] };
}

// ==========================================================================
// FILE TYPE DETECTION
// ==========================================================================

function detectAndParse(filename, content) {
  const base = path.basename(filename).toLowerCase();

  // JSON-based manifests
  if (base === 'package.json') return parsePackageJson(content);
  if (base === 'package-lock.json') return parsePackageLockJson(content);
  if (base === 'composer.json') return parseComposerJson(content);

  // Python
  if (base === 'requirements.txt' || base === 'constraints.txt' || base === 'requirements.in')
    return parseRequirementsTxt(content);
  if (base === 'pipfile') return parsePipfile(content);
  if (base === 'pyproject.toml') return parsePyprojectToml(content);
  if (base === 'setup.cfg' || base === 'setup.py') return parseRequirementsTxt(content); // best-effort

  // JVM
  if (base === 'pom.xml') return parsePomXml(content);
  if (base === 'build.gradle' || base === 'build.gradle.kts') return parseBuildGradle(content);

  // Ruby
  if (base === 'gemfile') return parseGemfile(content);

  // Go
  if (base === 'go.mod') return parseGoMod(content);

  // Rust
  if (base === 'cargo.toml') return parseCargoToml(content);

  // Dart/Flutter
  if (base === 'pubspec.yaml') return parsePubspecYaml(content);

  // Swift
  if (base === 'package.swift') return parsePackageSwift(content);

  // .NET
  if (base.endsWith('.csproj') || base.endsWith('.fsproj') || base.endsWith('.vbproj'))
    return parseCsproj(content);
  if (base === 'packages.config') return parsePackagesConfig(content);

  // Lockfiles
  if (base === 'yarn.lock') return parseYarnLock(content);
  if (base === 'gemfile.lock') return parseGemfile(content); // best-effort

  // Extension-based fallbacks
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.json') {
    try {
      return parsePackageJson(content);
    } catch {
      return null;
    }
  }
  if (ext === '.txt' || ext === '.in') return parseRequirementsTxt(content);
  if (ext === '.toml') return parseCargoToml(content);
  if (ext === '.xml') return parsePomXml(content);
  if (ext === '.gradle' || ext === '.kts') return parseBuildGradle(content);
  if (ext === '.yaml' || ext === '.yml') return parsePubspecYaml(content);

  return null;
}

// ==========================================================================
// ECOSYSTEM-SPECIFIC SUB-DEPENDENCY FETCHERS
// ==========================================================================

async function fetchNpmSubDeps(depNames, nodes, edges) {
  const layer2Deps = new Set();
  const fetchPromises = depNames.slice(0, 8).map(async (dep) => {
    try {
      const response = await axios.get(`https://registry.npmjs.org/${dep}/latest`, { timeout: 3000 });
      const subDeps = Object.keys(response.data.dependencies || {}).slice(0, 3);
      subDeps.forEach(sub => {
        layer2Deps.add(sub);
        edges.push([dep, sub]);
      });
    } catch(e) {
      console.warn(`Failed to fetch sub-deps for ${dep}:`, e.message);
    }
  });
  await Promise.all(fetchPromises);
  return layer2Deps;
}

// ==========================================================================
// VULNERABILITY SOURCES
// ==========================================================================

/**
 * Source 1: OSV (Open Source Vulnerabilities) — api.osv.dev
 * Free, no key needed. Batch endpoint.
 */
async function fetchOSV(queries) {
  const allResults = [];
  try {
    const batches = [];
    for (let i = 0; i < queries.length; i += 1000) {
      batches.push(queries.slice(i, i + 1000));
    }
    for (const batch of batches) {
      const resp = await axios.post('https://api.osv.dev/v1/querybatch', { queries: batch }, { timeout: 15000 });
      allResults.push(...(resp.data.results || []));
    }
  } catch (err) {
    console.error('OSV API error:', err.message);
  }
  return allResults;
}

/**
 * Source 2: NVD (National Vulnerability Database) — services.nvd.nist.gov
 * Free, no key needed (rate-limited to ~5 req/30s without key).
 * We query by keyword (package name). Returns CVEs with CVSS scores.
 */
async function fetchNVD(packageName) {
  try {
    const resp = await axios.get('https://services.nvd.nist.gov/rest/json/cves/2.0', {
      params: { keywordSearch: packageName, resultsPerPage: 10 },
      timeout: 10000,
      headers: { 'User-Agent': 'RippleGuard/1.0' }
    });
    const vulns = (resp.data.vulnerabilities || []).map(v => {
      const cve = v.cve || {};
      const metrics = cve.metrics || {};
      // Try to get CVSS v3.1 score, then v3.0, then v2
      let cvssScore = null;
      let severity = 'UNKNOWN';
      if (metrics.cvssMetricV31 && metrics.cvssMetricV31[0]) {
        cvssScore = metrics.cvssMetricV31[0].cvssData?.baseScore;
        severity = metrics.cvssMetricV31[0].cvssData?.baseSeverity || severity;
      } else if (metrics.cvssMetricV30 && metrics.cvssMetricV30[0]) {
        cvssScore = metrics.cvssMetricV30[0].cvssData?.baseScore;
        severity = metrics.cvssMetricV30[0].cvssData?.baseSeverity || severity;
      } else if (metrics.cvssMetricV2 && metrics.cvssMetricV2[0]) {
        cvssScore = metrics.cvssMetricV2[0].cvssData?.baseScore;
        severity = metrics.cvssMetricV2[0].baseSeverity || severity;
      }
      const desc = (cve.descriptions || []).find(d => d.lang === 'en');
      return {
        id: cve.id || 'UNKNOWN',
        summary: desc ? desc.value : 'No description available',
        source: 'NVD',
        cvssScore,
        severity,
        aliases: (cve.id ? [cve.id] : []),
      };
    });
    return vulns;
  } catch (err) {
    // Rate-limited or error — silently skip
    if (err.response && err.response.status === 403) {
      console.warn(`NVD rate-limited for "${packageName}"`);
    }
    return [];
  }
}

/**
 * Source 3: Sonatype OSS Index — ossindex.sonatype.org
 * Free, no auth for up to 128 components per request.
 * Uses Package URL (purl) format.
 */
function ecosystemToPurlType(ecosystem) {
  const map = {
    'npm': 'npm',
    'PyPI': 'pypi',
    'Maven': 'maven',
    'RubyGems': 'gem',
    'Go': 'golang',
    'crates.io': 'cargo',
    'NuGet': 'nuget',
    'Packagist': 'composer',
    'Pub': 'pub',
  };
  return map[ecosystem] || null;
}

async function fetchOSSIndex(depNames, ecosystem) {
  const purlType = ecosystemToPurlType(ecosystem);
  if (!purlType) return {}; // Unsupported ecosystem for OSS Index

  const results = {};
  // OSS Index accepts up to 128 coordinates per request
  const batchSize = 128;
  for (let i = 0; i < depNames.length; i += batchSize) {
    const batch = depNames.slice(i, i + batchSize);
    const coordinates = batch.map(name => {
      // Maven uses group:artifact format
      if (purlType === 'maven' && name.includes(':')) {
        const [group, artifact] = name.split(':');
        return `pkg:${purlType}/${group}/${artifact}`;
      }
      return `pkg:${purlType}/${name}`;
    });

    try {
      const resp = await axios.post('https://ossindex.sonatype.org/api/v3/component-report', {
        coordinates
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RippleGuard/1.0'
        }
      });

      for (const comp of (resp.data || [])) {
        if (comp.vulnerabilities && comp.vulnerabilities.length > 0) {
          // Extract package name from purl
          const purlParts = comp.coordinates.replace(`pkg:${purlType}/`, '').split('@')[0];
          const pkgName = batch.find(b => {
            if (purlType === 'maven' && b.includes(':')) {
              const [g, a] = b.split(':');
              return purlParts === `${g}/${a}`;
            }
            return purlParts === b;
          }) || purlParts;

          results[pkgName] = comp.vulnerabilities.map(v => ({
            id: v.cve || v.id || 'SONATYPE-' + (v.id || 'UNKNOWN'),
            summary: v.title || v.description || 'No description',
            source: 'OSS Index',
            cvssScore: v.cvssScore || null,
            severity: v.cvssScore >= 9 ? 'CRITICAL' : v.cvssScore >= 7 ? 'HIGH' : v.cvssScore >= 4 ? 'MEDIUM' : 'LOW',
            aliases: v.cve ? [v.cve] : [],
            reference: v.reference || null,
          }));
        }
      }
    } catch (err) {
      console.warn('OSS Index error:', err.message);
    }
  }
  return results;
}

// ==========================================================================
// MERGE & DEDUPLICATE VULNERABILITIES
// ==========================================================================

function mergeVulns(osvVulns, nvdVulns, ossVulns) {
  // Combine all, tag with source, deduplicate by ID/alias
  const seen = new Set();
  const merged = [];

  // Add OSV vulns (already structured)
  for (const v of (osvVulns || [])) {
    const id = v.id || '';
    if (!seen.has(id)) {
      seen.add(id);
      // Also add all aliases to the seen set
      for (const alias of (v.aliases || [])) {
        seen.add(alias);
      }
      merged.push({ ...v, source: v.source || 'OSV' });
    }
  }

  // Add NVD vulns
  for (const v of (nvdVulns || [])) {
    const id = v.id || '';
    if (!seen.has(id)) {
      seen.add(id);
      for (const alias of (v.aliases || [])) {
        seen.add(alias);
      }
      merged.push(v);
    }
  }

  // Add OSS Index vulns
  for (const v of (ossVulns || [])) {
    const id = v.id || '';
    if (!seen.has(id)) {
      seen.add(id);
      for (const alias of (v.aliases || [])) {
        seen.add(alias);
      }
      merged.push(v);
    }
  }

  return merged;
}

// ==========================================================================
// MAIN ROUTE
// ==========================================================================

app.post('/api/analyze', upload.single('manifestFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalName = req.body.originalName || req.file.originalname || 'unknown';
    const fileContent = fs.readFileSync(req.file.path, 'utf8');

    const parsed = detectAndParse(originalName, fileContent);

    if (!parsed || parsed.deps.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Unsupported or empty manifest: ${originalName}. Supported: package.json, requirements.txt, pom.xml, build.gradle, Gemfile, go.mod, Cargo.toml, composer.json, pubspec.yaml, .csproj, Package.swift, and more.`
      });
    }

    const { ecosystem, appName, deps: depNames, versions } = parsed;

    const nodes = [];
    const edges = [];

    // Layer 0: The uploaded application
    nodes.push({ id: appName, name: appName, type: 'app', layer: 0, vuln: 0 });

    // Prepare arrays for OSV
    const queries = [];
    const nodeOrder = [];

    // Layer 1: Direct dependencies
    depNames.forEach(dep => {
      nodes.push({ id: dep, name: dep, type: 'package', layer: 1, vuln: 0 });
      edges.push([appName, dep]);
      
      const query = { package: { name: dep, ecosystem } };
      if (versions && versions[dep]) {
        // Strip semver operators (^, ~, >, <, =) for OSV compatibility
        const cleanVer = versions[dep].replace(/^[=<>!~^]+/, '');
        if (cleanVer) query.version = cleanVer;
      }
      queries.push(query);
      nodeOrder.push(dep);
    });

    // Fetch Layer 2 (sub-dependencies) for visual depth — only for npm for now
    if (ecosystem === 'npm') {
      const layer2Deps = await fetchNpmSubDeps(depNames, nodes, edges);
      layer2Deps.forEach(sub => {
        if (!nodes.find(n => n.id === sub)) {
          nodes.push({ id: sub, name: sub, type: 'package', layer: 2, vuln: 0 });
          queries.push({ package: { name: sub, ecosystem } });
          nodeOrder.push(sub);
        }
      });
    }

    console.log(`Scanning ${nodeOrder.length} packages across 3 databases (OSV + NVD + OSS Index)...`);

    // ========== FETCH ALL 3 SOURCES IN PARALLEL ==========

    // 1. OSV — batch query for all packages
    const osvPromise = fetchOSV(queries);

    // 2. NVD — query up to 15 packages (rate-limited to avoid 403s)
    //    Prioritize Layer 1 (direct deps) and limit to avoid hammering NVD
    const nvdPackages = nodeOrder.slice(0, 15);
    const nvdPromises = nvdPackages.map((name, i) =>
      // Stagger requests slightly to avoid rate limits
      new Promise(resolve => setTimeout(() => resolve(fetchNVD(name)), i * 200))
    );
    const nvdPromise = Promise.all(nvdPromises);

    // 3. OSS Index — batch query (supports 128 per request)
    const ossPromise = fetchOSSIndex(nodeOrder, ecosystem);

    // Wait for all three
    const [osvResults, nvdResults, ossResults] = await Promise.all([
      osvPromise,
      nvdPromise,
      ossPromise,
    ]);

    // ========== MERGE RESULTS PER NODE ==========
    const osvDetails = {};
    let totalSources = { osv: 0, nvd: 0, oss: 0 };

    nodeOrder.forEach((nodeId, index) => {
      const node = nodes.find(n => n.id === nodeId);

      // OSV vulns for this node
      const osvNodeResult = osvResults[index];
      const osvVulns = (osvNodeResult && osvNodeResult.vulns) ? osvNodeResult.vulns.map(v => ({ ...v, source: 'OSV' })) : [];

      // NVD vulns for this node (only if in the NVD batch)
      const nvdIndex = nvdPackages.indexOf(nodeId);
      const nvdVulns = nvdIndex >= 0 ? (nvdResults[nvdIndex] || []) : [];

      // OSS Index vulns for this node
      const ossVulns = ossResults[nodeId] || [];

      // Merge and deduplicate
      const merged = mergeVulns(osvVulns, nvdVulns, ossVulns);

      if (merged.length > 0) {
        // Compute vuln score — use max CVSS if available, else count-based
        const maxCvss = Math.max(...merged.map(v => v.cvssScore || 0));
        if (maxCvss > 0) {
          node.vuln = Math.min(100, Math.round(maxCvss * 10));
        } else {
          node.vuln = Math.min(100, merged.length * 20);
        }
        osvDetails[nodeId] = merged;

        // Count sources
        if (osvVulns.length > 0) totalSources.osv++;
        if (nvdVulns.length > 0) totalSources.nvd++;
        if (ossVulns.length > 0) totalSources.oss++;
      } else {
        node.vuln = 0;
      }
    });

    // Fetch full OSV records for enrichment (in concurrent batches of 25)
    const vulnIdsToFetch = new Set();
    for (const [nodeId, vulns] of Object.entries(osvDetails)) {
      for (const v of vulns) {
        if (v.source === 'OSV' && v.id) {
          vulnIdsToFetch.add(v.id);
        }
      }
    }

    const idsToFetch = [...vulnIdsToFetch];
    const fullOsvDetails = {};

    if (idsToFetch.length > 0) {
      console.log(`Fetching full OSV details for all ${idsToFetch.length} vulnerabilities across packages...`);
      const BATCH_SIZE = 25;
      for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
        const batch = idsToFetch.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (id) => {
            try {
              const resp = await axios.get(`https://api.osv.dev/v1/vulns/${id}`, { timeout: 8000 });
              return { id, data: resp.data };
            } catch {
              return { id, data: null };
            }
          })
        );
        for (const { id, data } of batchResults) {
          if (data) fullOsvDetails[id] = data;
        }
      }
    }

    // Enrich merged vulns with full OSV data (timestamps, fix versions, severity, descriptions)
    for (const [nodeId, vulns] of Object.entries(osvDetails)) {
      for (let i = 0; i < vulns.length; i++) {
        const v = vulns[i];
        const full = fullOsvDetails[v.id];
        if (full) {
          // Add timestamps
          v.published = full.published || null;
          v.modified = full.modified || null;

          // Add fix version info
          if (full.affected && full.affected.length > 0) {
            const aff = full.affected.find(a => a.package && a.package.name === nodeId) || full.affected[0];
            if (aff) {
              v.affectedPackage = aff.package?.name || nodeId;
              v.affectedVersions = aff.versions || [];

              // Extract fix events from ranges
              if (aff.ranges) {
                for (const range of aff.ranges) {
                  if (range.events) {
                    const fixEvent = range.events.find(e => e.fixed);
                    const introEvent = range.events.find(e => e.introduced);
                    if (fixEvent && !v.fixVersion) v.fixVersion = fixEvent.fixed;
                    if (introEvent && !v.introducedVersion) v.introducedVersion = introEvent.introduced;
                  }
                }
              }
            }
          }

          // Add database_specific
          if (full.database_specific) {
            v.database_specific = full.database_specific;
          } else if (aff && aff.database_specific) {
            v.database_specific = aff.database_specific;
          }

          // Add severity from OSV
          if (full.severity && full.severity[0]) {
            v.osvSeverityType = full.severity[0].type;
            v.osvSeverityScore = full.severity[0].score;
          }

          // Enrich summary / details / description
          if (full.summary) v.summary = full.summary;
          if (full.details) v.details = full.details;
          v.description = v.summary || v.details || full.summary || full.details || v.description;
          if (full.aliases) v.aliases = [...new Set([...(v.aliases || []), ...full.aliases])];
        }

        // Compute fix lag (days since fix available)
        if (v.fixVersion && v.published) {
          const pubDate = new Date(v.published);
          const now = new Date();
          v.fixLagDays = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));
        }

        // Normalize severity for all sources
        if (v.cvssScore) {
          v.severity = v.cvssScore >= 9 ? 'CRITICAL' : v.cvssScore >= 7 ? 'HIGH' : v.cvssScore >= 4 ? 'MEDIUM' : 'LOW';
        }
        // Try to derive from database_specific severity (OSV / GitHub Advisory)
        if ((!v.severity || v.severity === 'UNKNOWN') && v.database_specific && v.database_specific.severity) {
          v.severity = v.database_specific.severity.toUpperCase();
        }
        // Try to derive severity from OSV CVSS vector score
        if ((!v.severity || v.severity === 'UNKNOWN') && v.osvSeverityScore) {
          const baseScoreMatch = v.osvSeverityScore.match(/(\d+\.?\d*)\s*$/);
          if (baseScoreMatch) {
            const score = parseFloat(baseScoreMatch[1]);
            v.cvssScore = score;
            v.severity = score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';
          } else if (v.osvSeverityScore.includes('C:H') || v.osvSeverityScore.includes('A:H') || v.osvSeverityScore.includes('I:H')) {
            v.severity = 'HIGH';
          }
        }
        if (!v.severity) {
          v.severity = 'MEDIUM';
        }
      }
    }

    // ========== COMPUTE SEVERITY DISTRIBUTION ==========
    const severityDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    const allVulnIds = new Set();

    for (const [nodeId, vulns] of Object.entries(osvDetails)) {
      for (const v of vulns) {
        const vid = v.id || `${nodeId}-${v.summary?.slice(0, 20)}`;
        if (!allVulnIds.has(vid)) {
          allVulnIds.add(vid);
          const sev = (v.severity || 'UNKNOWN').toUpperCase();
          if (severityDist.hasOwnProperty(sev)) {
            severityDist[sev]++;
          } else {
            severityDist.UNKNOWN++;
          }
        }
      }
    }

    // ========== COMPUTE DIRECT VS TRANSITIVE ==========
    let directVulnCount = 0;
    let transitiveVulnCount = 0;

    for (const [nodeId, vulns] of Object.entries(osvDetails)) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        if (node.layer === 1) {
          directVulnCount += vulns.length;
        } else if (node.layer >= 2) {
          transitiveVulnCount += vulns.length;
        }
      }
    }

    const directVsTransitive = {
      direct: directVulnCount,
      transitive: transitiveVulnCount,
      directPackages: Object.keys(osvDetails).filter(id => {
        const n = nodes.find(node => node.id === id);
        return n && n.layer === 1;
      }).length,
      transitivePackages: Object.keys(osvDetails).filter(id => {
        const n = nodes.find(node => node.id === id);
        return n && n.layer >= 2;
      }).length,
    };

    // ========== BUILD VULNERABILITY TRACE PATHS ==========
    // For each vulnerable node, trace the path from root app to the vulnerable node
    const vulnTraces = {};

    // Build a forward adjacency map (parent → children) from edges
    const childrenMap = {};
    nodes.forEach(n => { childrenMap[n.id] = []; });
    edges.forEach(([from, to]) => { childrenMap[from].push(to); });

    function findPath(startId, targetId, visited = new Set()) {
      if (startId === targetId) return [startId];
      visited.add(startId);
      for (const child of (childrenMap[startId] || [])) {
        if (!visited.has(child)) {
          const path = findPath(child, targetId, visited);
          if (path) return [startId, ...path];
        }
      }
      return null;
    }

    for (const vulnNodeId of Object.keys(osvDetails)) {
      const trace = findPath(appName, vulnNodeId);
      if (trace && trace.length > 1) {
        vulnTraces[vulnNodeId] = trace;
      }
    }

    // ========== GENERATE SMART FIX RECOMMENDATIONS (DTReme-style) ==========
    // For each direct dependency, calculate how many transitive vulns upgrading it would fix
    const smartFixes = [];

    // Find all Layer 1 (direct) deps
    const directDeps = nodes.filter(n => n.layer === 1);

    for (const directDep of directDeps) {
      // Find all downstream nodes reachable from this direct dep
      const reachable = new Set();
      const queue = [directDep.id];
      while (queue.length > 0) {
        const current = queue.shift();
        for (const child of (childrenMap[current] || [])) {
          if (!reachable.has(child)) {
            reachable.add(child);
            queue.push(child);
          }
        }
      }

      // Count vulns in reachable transitive deps
      const transitiveVulns = [];
      for (const reachableId of reachable) {
        if (osvDetails[reachableId]) {
          for (const v of osvDetails[reachableId]) {
            transitiveVulns.push({
              vulnId: v.id,
              package: reachableId,
              severity: v.severity,
              fixVersion: v.fixVersion || null,
            });
          }
        }
      }

      // Also count direct dep's own vulns
      const ownVulns = osvDetails[directDep.id] || [];
      const totalFixable = ownVulns.length + transitiveVulns.length;

      if (totalFixable > 0) {
        // Find if any fix version exists for the direct dep itself
        const directFixVersion = ownVulns.find(v => v.fixVersion)?.fixVersion || null;
        const fixLagDays = ownVulns.find(v => v.fixLagDays)?.fixLagDays || null;

        smartFixes.push({
          dep: directDep.id,
          name: directDep.name,
          ownVulnCount: ownVulns.length,
          transitiveVulnCount: transitiveVulns.length,
          totalFixable,
          fixVersion: directFixVersion,
          fixLagDays,
          affectedTransitives: [...new Set(transitiveVulns.map(v => v.package))],
          severityBreakdown: {
            CRITICAL: transitiveVulns.filter(v => v.severity === 'CRITICAL').length + ownVulns.filter(v => v.severity === 'CRITICAL').length,
            HIGH: transitiveVulns.filter(v => v.severity === 'HIGH').length + ownVulns.filter(v => v.severity === 'HIGH').length,
            MEDIUM: transitiveVulns.filter(v => v.severity === 'MEDIUM').length + ownVulns.filter(v => v.severity === 'MEDIUM').length,
            LOW: transitiveVulns.filter(v => v.severity === 'LOW').length + ownVulns.filter(v => v.severity === 'LOW').length,
          },
        });
      }
    }

    // Sort smart fixes by total impact (most fixable first)
    smartFixes.sort((a, b) => b.totalFixable - a.totalFixable);

    const totalVulnNodes = Object.keys(osvDetails).length;
    console.log(`Scan complete: ${totalVulnNodes} vulnerable packages found.`);
    console.log(`  OSV contributed to ${totalSources.osv} packages`);
    console.log(`  NVD contributed to ${totalSources.nvd} packages`);
    console.log(`  OSS Index contributed to ${totalSources.oss} packages`);
    console.log(`  Severity: ${severityDist.CRITICAL}C / ${severityDist.HIGH}H / ${severityDist.MEDIUM}M / ${severityDist.LOW}L`);
    console.log(`  Direct vulns: ${directVulnCount}, Transitive vulns: ${transitiveVulnCount}`);
    console.log(`  Smart fixes generated: ${smartFixes.length}`);

    // ========== GENERATE FIXED MANIFEST (COMPREHENSIVE MULTI-ECOSYSTEM) ==========
    let fixedManifest = null;
    try {
      // 1. Gather the absolute latest fix versions for every single vulnerable package
      const packagesToFix = {};
      for (const pkg in osvDetails) {
        const vulns = osvDetails[pkg];
        const fixVersion = vulns.find(v => v.fixVersion)?.fixVersion;
        if (fixVersion) {
          packagesToFix[pkg] = fixVersion;
        }
      }

      if (Object.keys(packagesToFix).length > 0) {
        if (ecosystem === 'npm') {
          // NPM: Use direct version bumps + 'overrides' for transitives
          const parsedJson = JSON.parse(fileContent);
          let changed = false;
          
          for (const [pkg, fixVer] of Object.entries(packagesToFix)) {
            let isDirect = false;
            if (parsedJson.dependencies && parsedJson.dependencies[pkg]) {
              parsedJson.dependencies[pkg] = `^${fixVer}`;
              isDirect = true;
              changed = true;
            } 
            if (parsedJson.devDependencies && parsedJson.devDependencies[pkg]) {
              parsedJson.devDependencies[pkg] = `^${fixVer}`;
              isDirect = true;
              changed = true;
            }
            
            // If it's transitive or we just want to be absolutely sure, add to overrides
            if (!isDirect) {
              if (!parsedJson.overrides) parsedJson.overrides = {};
              parsedJson.overrides[pkg] = `^${fixVer}`;
              changed = true;
            }
          }
          
          if (changed) fixedManifest = JSON.stringify(parsedJson, null, 2);

        } else if (ecosystem === 'PyPI') {
          // Python: Update direct, append transitives
          let lines = fileContent.split(/\r?\n/);
          let changed = false;
          let addedTransitiveHeader = false;
          
          for (const [pkg, fixVer] of Object.entries(packagesToFix)) {
            const regex = new RegExp(`^${pkg}(==|>=|<=|>|<|~=).*$`, 'i');
            let found = false;
            for (let i = 0; i < lines.length; i++) {
              if (regex.test(lines[i].trim())) {
                lines[i] = `${pkg}>=${fixVer} # RippleGuard Auto-Fix`;
                found = true;
                changed = true;
              }
            }
            if (!found) {
              if (!addedTransitiveHeader) {
                lines.push('\n# RIPPLEGUARD AUTO-FIX: Transitive Dependency Overrides');
                addedTransitiveHeader = true;
              }
              lines.push(`${pkg}>=${fixVer}`);
              changed = true;
            }
          }
          if (changed) fixedManifest = lines.join('\n');

        } else if (ecosystem === 'Maven') {
          // Maven: Replace direct tags + inject <dependencyManagement>
          let patchedXml = fileContent;
          let mgmtDeps = '';
          
          for (const [pkg, fixVer] of Object.entries(packagesToFix)) {
            const parts = pkg.split(':');
            if (parts.length === 2) {
              const groupId = parts[0];
              const artifactId = parts[1];
              
              // Direct replacement attempt
              const depRegex = new RegExp(`(<groupId>\\s*${groupId}\\s*</groupId>\\s*<artifactId>\\s*${artifactId}\\s*</artifactId>\\s*<version>)([^<]+)(</version>)`, 'g');
              patchedXml = patchedXml.replace(depRegex, `$1${fixVer}$3`);
              
              // Build management block for transitives
              mgmtDeps += `\n      <dependency>\n        <groupId>${groupId}</groupId>\n        <artifactId>${artifactId}</artifactId>\n        <version>${fixVer}</version>\n      </dependency>`;
            }
          }
          
          if (mgmtDeps && patchedXml.includes('</project>')) {
            const mgmtBlock = `\n  <!-- RIPPLEGUARD AUTO-FIX: Enforcing safe versions for transitive vulnerabilities -->\n  <dependencyManagement>\n    <dependencies>${mgmtDeps}\n    </dependencies>\n  </dependencyManagement>\n`;
            patchedXml = patchedXml.replace('</project>', mgmtBlock + '</project>');
          }
          
          fixedManifest = patchedXml;
        }
      }
    } catch (err) {
      console.error("Failed to generate fixed manifest:", err);
    }

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    // Return dynamically generated ecosystem with enriched data
    res.json({
      nodes,
      edges,
      osvDetails,
      ecosystem,
      sources: ['OSV', 'NVD', 'OSS Index'],
      sourceStats: totalSources,
      // New research-backed fields
      severityDist,
      directVsTransitive,
      vulnTraces,
      smartFixes,
      fixedManifest,
    });

  } catch (error) {
    console.error(error);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`DomiNode OSV Backend running on port ${PORT}`));


