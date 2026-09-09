const VIEW_WIDTH = 900;
const LAYER_Y = { 0: 60, 1: 210, 2: 360, 3: 500 };

function computePositions() {
  const positions = {};
  const byLayer = {};
  NODES.forEach(node => {
    if (!byLayer[node.layer]) byLayer[node.layer] = [];
    byLayer[node.layer].push(node);
  });

  const cx = 450;
  const cy = 275; // Root node dead center of the 900x550 canvas
  
  // Radii scaled up to make the graph look larger and fill the screen
  const layerRadiiX = { 0: 0, 1: 180, 2: 320, 3: 420, 4: 440 };
  const layerRadiiY = { 0: 0, 1: 110, 2: 200, 3: 250, 4: 265 };

  const layerKeys = Object.keys(byLayer).sort((a, b) => a - b);

  layerKeys.forEach(layerNum => {
    const layer = parseInt(layerNum);
    const nodesInLayer = byLayer[layer];
    const n = nodesInLayer.length;
    
    let Rx = layerRadiiX[layer] || (layer * 140); 
    let Ry = layerRadiiY[layer] || (layer * 85);
    if (layer === 0 && n > 1) { Rx = 40; Ry = 25; }

    // Full 360 degree spread (up, down, left, right)
    const angleRange = 2 * Math.PI;
    const angleStep = n > 0 ? angleRange / n : 0;
    
    // Rotate each layer slightly so the nodes interleave organically
    const angleOffset = layer * (Math.PI / 3);

    nodesInLayer.forEach((node, index) => {
      const angle = angleOffset + (index * angleStep);
      
      // Add a tiny stagger for an organic, non-rigid feel
      const staggerX = (index % 2 === 0) ? Rx - 15 : Rx + 15;
      const staggerY = (index % 2 === 0) ? Ry - 10 : Ry + 10;
      
      if (layer === 0 && n === 1) {
        positions[node.id] = { x: cx, y: cy };
      } else {
        positions[node.id] = { 
          x: cx + staggerX * Math.cos(angle), 
          y: cy + staggerY * Math.sin(angle) 
        };
      }
    });
  });

  return positions;
}

let POSITIONS = {};

function createSvgElement(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
  return el;
}

function buildDependentsMap() {
  const dependents = {};
  NODES.forEach(n => { dependents[n.id] = []; });
  EDGES.forEach(([from, to]) => { dependents[to].push(from); });
  return dependents;
}

let DEPENDENTS = {};

function propagate(startId) {
  const distances = new Map();
  const seen = new Set([startId]);
  let frontier = [startId];
  let hop = 0;
  while (frontier.length > 0) {
    hop++;
    const nextFrontier = [];
    frontier.forEach(currentId => {
      DEPENDENTS[currentId].forEach(dependentId => {
        if (!seen.has(dependentId)) {
          seen.add(dependentId);
          distances.set(dependentId, hop);
          nextFrontier.push(dependentId);
        }
      });
    });
    frontier = nextFrontier;
  }
  return distances;
}

let TOTAL_NODES = 0;
let TOTAL_APPS = 0;
let MAX_DIRECT_DEPENDENTS = 0;

function computeMetrics(nodeId) {
  const node = NODES.find(n => n.id === nodeId);
  const affected = propagate(nodeId);
  const affectedIds = [...affected.keys()];
  const affectedApps = affectedIds.filter(id => NODES.find(n => n.id === id).type === "app");
  const directDependents = DEPENDENTS[nodeId].length;

  const appCoveragePct = (affectedApps.length / TOTAL_APPS) * 100;
  const blastRadiusPct = (affected.size / (TOTAL_NODES - 1)) * 100;
  const fanInPct = (directDependents / MAX_DIRECT_DEPENDENTS) * 100;

  // OSV Risk
  const structural = (0.5 * appCoveragePct) + (0.3 * blastRadiusPct) + (0.2 * fanInPct);
  
  // Mock SAST (Semgrep) and SCA (Trivy) Scores
  // Give high severity OSV nodes higher SAST/SCA scores for realistic demo
  let sastScore = 0;
  let scaScore = 0;
  
  if (node.vuln > 70) {
    sastScore = Math.floor(Math.random() * 30) + 70; // 70-100
    scaScore = Math.floor(Math.random() * 20) + 80;  // 80-100
  } else if (node.vuln > 40) {
    sastScore = Math.floor(Math.random() * 30) + 40; // 40-70
    scaScore = Math.floor(Math.random() * 30) + 50;  // 50-80
  } else {
    sastScore = Math.floor(Math.random() * 20);      // 0-20
    scaScore = Math.floor(Math.random() * 30);       // 0-30
  }
  
  // Combine OSV, Structural, SAST, and SCA
  const aggregateVulnerability = (0.5 * node.vuln) + (0.25 * sastScore) + (0.25 * scaScore);
  const trueRisk = Math.round((0.65 * structural) + (0.35 * aggregateVulnerability));

  return {
    directDependents,
    affectedCount: affected.size,
    affectedAppsCount: affectedApps.length,
    sastScore,
    scaScore,
    trueRisk: Math.max(0, Math.min(100, trueRisk)),
  };
}

let METRICS = {};

function initEcosystemState() {
  POSITIONS = computePositions();
  DEPENDENTS = buildDependentsMap();
  TOTAL_NODES = NODES.length;
  TOTAL_APPS = NODES.filter(n => n.type === "app").length;
  const directDepsCounts = NODES.map(n => DEPENDENTS[n.id] ? DEPENDENTS[n.id].length : 0);
  MAX_DIRECT_DEPENDENTS = directDepsCounts.length > 0 ? Math.max(...directDepsCounts) : 1;
  if (MAX_DIRECT_DEPENDENTS === 0) MAX_DIRECT_DEPENDENTS = 1;

  METRICS = {};
  NODES.filter(n => n.type === "package").forEach(n => {
    METRICS[n.id] = computeMetrics(n.id);
  });
}

function riskColor(score) {
  if (score >= 70) return "#ef4444"; // Red — Critical
  if (score >= 52) return "#f97316"; // Orange — High
  if (score >= 35) return "#facc15"; // Yellow — Medium
  return "#22c55e";                  // Green — Low
}

function riskLabel(score) {
  if (score >= 70) return "Critical — Contain now";
  if (score >= 52) return "High — Prioritize this sprint";
  if (score >= 35) return "Medium — Scheduled review";
  return "Low — Standard patch cycle";
}