// ---------- SETUP: positions ----------

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

// ---------- GRAPH DIRECTION HELPERS ----------

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

// ---------- NEW: RISK SCORING ----------

const TOTAL_NODES = NODES.length;
const TOTAL_APPS = NODES.filter(n => n.type === "app").length;
const MAX_DIRECT_DEPENDENTS = Math.max(...NODES.map(n => DEPENDENTS[n.id].length));

// Calculate every metric for one node, based on what its compromise would reach.
function computeMetrics(nodeId) {
  const node = NODES.find(n => n.id === nodeId);
  const affected = propagate(nodeId);
  const affectedIds = [...affected.keys()];
  const affectedApps = affectedIds.filter(id => NODES.find(n => n.id === id).type === "app");
  const directDependents = DEPENDENTS[nodeId].length;

  const appCoveragePct = (affectedApps.length / TOTAL_APPS) * 100;
  const blastRadiusPct = (affected.size / (TOTAL_NODES - 1)) * 100;
  const fanInPct = (directDependents / MAX_DIRECT_DEPENDENTS) * 100;

  // Structural criticality: how far the damage spreads, regardless of the CVE score.
  const structural = (0.5 * appCoveragePct) + (0.3 * blastRadiusPct) + (0.2 * fanInPct);

  // True risk: mostly structural, but still respects the reported vuln score.
  const trueRisk = Math.round((0.65 * structural) + (0.35 * node.vuln));

  return {
    directDependents,
    affectedCount: affected.size,
    affectedAppsCount: affectedApps.length,
    appCoveragePct: Math.round(appCoveragePct),
    blastRadiusPct: Math.round(blastRadiusPct),
    structural: Math.round(structural),
    trueRisk: Math.max(0, Math.min(100, trueRisk)),
  };
}

// Pre-calculate this once for every package, so we're not recalculating on every click.
const METRICS = {};
NODES.filter(n => n.type === "package").forEach(n => {
  METRICS[n.id] = computeMetrics(n.id);
});

function riskColor(score) {
  if (score >= 70) return "#c4432b"; // contain now
  if (score >= 45) return "#c9a227"; // prioritize
  return "#4c8c6b";                  // routine
}

function riskLabel(score) {
  if (score >= 70) return "Contain now";
  if (score >= 45) return "Prioritize this sprint";
  return "Standard patch cycle";
}

// ---------- SIMULATION STATE ----------

let compromisedId = null;

function simulateCompromise(nodeId) {
  compromisedId = nodeId;
  drawGraph();
  updateInfoPanel();
}

function resetSimulation() {
  compromisedId = null;
  drawGraph();
  updateInfoPanel();
}

// ---------- DRAWING ----------

function drawGraph() {
  const svg = document.getElementById("graph");
  svg.innerHTML = "";

  const affected = compromisedId ? propagate(compromisedId) : new Map();
  const affectedIds = new Set(affected.keys());

  EDGES.forEach(([fromId, toId]) => {
    const from = POSITIONS[fromId];
    const to = POSITIONS[toId];
    const isTaintedEdge = compromisedId &&
      (fromId === compromisedId || affectedIds.has(fromId)) &&
      (toId === compromisedId || affectedIds.has(toId));

    const line = createSvgElement("line", {
      x1: from.x, y1: from.y + 14,
      x2: to.x, y2: to.y - 14,
      stroke: isTaintedEdge ? "#c4432b" : "#2a303c",
      "stroke-width": isTaintedEdge ? 2 : 1,
    });
    svg.appendChild(line);
  });

  NODES.forEach(node => {
    const pos = POSITIONS[node.id];

    // Baseline color now comes from the TRUE RISK score, not a flat green.
    let fill = node.type === "app" ? "#2c3444" : riskColor(METRICS[node.id].trueRisk);

    if (node.id === compromisedId) fill = "#ffffff";
    else if (affectedIds.has(node.id)) fill = "#c4432b";
    else if (compromisedId) fill = "#333a47";

    const circle = createSvgElement("circle", {
      cx: pos.x, cy: pos.y,
      r: node.type === "app" ? 15 : 13,
      fill: fill,
    });

    if (node.type === "package") {
      circle.addEventListener("click", () => simulateCompromise(node.id));
    }

    const label = createSvgElement("text", {
      x: pos.x, y: pos.y + 30,
      class: "node-label",
    });
    label.textContent = node.name;

    svg.appendChild(circle);
    svg.appendChild(label);
  });
}

// ---------- INFO PANEL ----------

function updateInfoPanel() {
  const panel = document.getElementById("info-panel");

  if (!compromisedId) {
    panel.innerHTML = `<p id="placeholder-text">Select a package to see its risk analysis.</p>`;
    return;
  }

  const node = NODES.find(n => n.id === compromisedId);
  const m = METRICS[compromisedId];
  const affected = propagate(compromisedId);

  const waveMap = {};
  affected.forEach((hop, id) => {
    if (!waveMap[hop]) waveMap[hop] = [];
    waveMap[hop].push(NODES.find(n => n.id === id).name);
  });

  let wavesHtml = "";
  Object.keys(waveMap).sort((a, b) => a - b).forEach(hop => {
    wavesHtml += `<p><strong>Hop ${hop}:</strong> ${waveMap[hop].join(", ")}</p>`;
  });

  const delta = m.trueRisk - node.vuln;
  const hiddenRiskNote = delta >= 15
    ? `<p style="color:#c4432b;">This package's reported vuln score (${node.vuln}) badly understates its real danger — ${m.affectedAppsCount} of ${TOTAL_APPS} apps ultimately depend on it.</p>`
    : "";

  panel.innerHTML = `
    <p><strong>${node.name}</strong></p>
    <p>Reported vuln score: ${node.vuln}</p>
    <p>True risk score: <span style="color:${riskColor(m.trueRisk)}">${m.trueRisk}</span></p>
    <p>Direct dependents: ${m.directDependents}</p>
    <p>Apps affected: ${m.affectedAppsCount} / ${TOTAL_APPS}</p>
    <p>Total blast radius: ${m.affectedCount} package(s)/app(s)</p>
    <p><strong>${riskLabel(m.trueRisk)}</strong></p>
    ${hiddenRiskNote}
    <p><strong>Propagation:</strong></p>
    ${wavesHtml}
    <button onclick="resetSimulation()">Reset</button>
  `;
}

// ---------- START ----------

drawGraph();
updateInfoPanel();
