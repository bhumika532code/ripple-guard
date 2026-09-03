const VIEW_WIDTH = 900;
const LAYER_Y = { 0: 60, 1: 210, 2: 360, 3: 500 };

function computePositions() {
  const positions = {};
  const byLayer = {};
  NODES.forEach(node => {
    if (!byLayer[node.layer]) byLayer[node.layer] = [];
    byLayer[node.layer].push(node);
  });
  Object.keys(byLayer).forEach(layer => {
    const nodesInLayer = byLayer[layer];
    const spacing = VIEW_WIDTH / (nodesInLayer.length + 1);
    nodesInLayer.forEach((node, index) => {
      positions[node.id] = { x: spacing * (index + 1), y: LAYER_Y[node.layer] };
    });
  });
  return positions;
}

const POSITIONS = computePositions();

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

const DEPENDENTS = buildDependentsMap();

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

const TOTAL_NODES = NODES.length;
const TOTAL_APPS = NODES.filter(n => n.type === "app").length;
const MAX_DIRECT_DEPENDENTS = Math.max(...NODES.map(n => DEPENDENTS[n.id].length));

function computeMetrics(nodeId) {
  const node = NODES.find(n => n.id === nodeId);
  const affected = propagate(nodeId);
  const affectedIds = [...affected.keys()];
  const affectedApps = affectedIds.filter(id => NODES.find(n => n.id === id).type === "app");
  const directDependents = DEPENDENTS[nodeId].length;

  const appCoveragePct = (affectedApps.length / TOTAL_APPS) * 100;
  const blastRadiusPct = (affected.size / (TOTAL_NODES - 1)) * 100;
  const fanInPct = (directDependents / MAX_DIRECT_DEPENDENTS) * 100;

  const structural = (0.5 * appCoveragePct) + (0.3 * blastRadiusPct) + (0.2 * fanInPct);
  const trueRisk = Math.round((0.65 * structural) + (0.35 * node.vuln));

  return {
    directDependents,
    affectedCount: affected.size,
    affectedAppsCount: affectedApps.length,
    trueRisk: Math.max(0, Math.min(100, trueRisk)),
  };
}

const METRICS = {};
NODES.filter(n => n.type === "package").forEach(n => {
  METRICS[n.id] = computeMetrics(n.id);
});

function riskColor(score) {
  if (score >= 70) return "#c4432b"; // Red — Critical
  if (score >= 52) return "#e67e22"; // Orange — High
  if (score >= 35) return "#c9a227"; // Yellow — Medium
  return "#4c8c6b";                  // Green — Low
}

function riskLabel(score) {
  if (score >= 70) return "Critical — Contain now";
  if (score >= 52) return "High — Prioritize this sprint";
  if (score >= 35) return "Medium — Scheduled review";
  return "Low — Standard patch cycle";
}