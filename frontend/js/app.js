/**
 * RIPPLE GUARD — Unified Application Controller
 * 
 * Handles:
 * 1. Project Upload & Ecosystem State
 * 2. Section 01: Dependency Graph & Interactive Info Panel
 * 3. Section 02: Vulnerability Scoreboard
 * 4. Section 03: Propagation Simulator with Hop-by-Hop Laser Pulse Conduits
 */

// Global state
let currentSimulationNode = null;
let activeLaserTimers = [];

// ==========================================================================
// 1. PROJECT UPLOAD & ECOSYSTEM STATE
// ==========================================================================

function initUploadArea() {
  const dropzone = document.getElementById("upload-dropzone");
  const fileInput = document.getElementById("project-file-input");
  const btnShowAnalysis = document.getElementById("btn-show-analysis");

  if (!dropzone || !fileInput) return;

  // Open file dialog on click
  dropzone.addEventListener("click", () => fileInput.click());

  // Drag and drop visual feedback
  ["dragenter", "dragover"].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
    });
  });

  // Handle dropped files
  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleUploadedFile(files[0]);
  });

  // Handle selected files
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleUploadedFile(e.target.files[0]);
  });

  // Smooth scroll to analysis
  if (btnShowAnalysis) {
    btnShowAnalysis.addEventListener("click", () => {
      const target = document.getElementById("section-graph");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
}

async function handleUploadedFile(file) {
  const uploadTitle = document.getElementById("upload-dropzone-title");
  const uploadSub = document.getElementById("upload-dropzone-sub");

  if (file.name.endsWith(".json") || file.name.includes("package")) {
    if (uploadTitle) uploadTitle.textContent = `Analyzing ${file.name}...`;
    if (uploadSub) uploadSub.innerHTML = `<span style="color:#38bdf8;">Querying real OSV Vulnerability Database...</span>`;

    const formData = new FormData();
    formData.append('packageJson', file);

    try {
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Backend analysis failed');
      
      const data = await response.json();
      
      // Update global state
      NODES = data.nodes;
      EDGES = data.edges;
      window.OSV_DETAILS = data.osvDetails || {};

      if (uploadTitle) uploadTitle.textContent = `Project Loaded: ${file.name}`;
      if (uploadSub) uploadSub.innerHTML = `<span style="color:#22c55e;">✔ Analyzed ${NODES.length} nodes via OSV API</span>`;

      // Re-initialize UI with new data
      initEcosystemState();
      drawDependencyGraph();
      buildScoreboard();
      initPropagationControls();
      initAIFixControls();
      resetPropagation();
      
    } catch (err) {
      console.error(err);
      if (uploadTitle) uploadTitle.textContent = `Error analyzing ${file.name}`;
      if (uploadSub) uploadSub.textContent = `Make sure the local backend is running on port 3000.`;
    }
  } else {
    if (uploadTitle) uploadTitle.textContent = `Invalid file: ${file.name}`;
    if (uploadSub) uploadSub.textContent = `Please upload a package.json file.`;
  }
}

// ==========================================================================
// 2. SECTION 01: DEPENDENCY GRAPH
// ==========================================================================

function drawDependencyGraph() {
  const svg = document.getElementById("graph");
  if (!svg) return;
  svg.innerHTML = "";

  // Layer guidelines/labels
  const layerNames = {
    0: "APPLICATIONS (ROOT ENTRIPOINTS)",
    1: "SERVICES & MID-TIER LIBS",
    2: "SHARED LOW-LEVEL LIBS",
    3: "DEEP CORE UTILITIES"
  };

  Object.keys(LAYER_Y).forEach(layer => {
    const y = LAYER_Y[layer];
    const guide = createSvgElement("line", {
      x1: 20, y1: y,
      x2: VIEW_WIDTH - 20, y2: y,
      stroke: "rgba(56, 189, 248, 0.05)",
      "stroke-dasharray": "4 6",
      "stroke-width": 1
    });
    const label = createSvgElement("text", {
      x: 30, y: y - 16,
      class: "layer-indicator-label"
    });
    label.textContent = layerNames[layer];
    svg.appendChild(guide);
    svg.appendChild(label);
  });

  // Edges
  EDGES.forEach(([fromId, toId]) => {
    const from = POSITIONS[fromId];
    const to = POSITIONS[toId];

    const line = createSvgElement("line", {
      x1: from.x, y1: from.y + 15,
      x2: to.x, y2: to.y - 15,
      stroke: "rgba(71, 85, 105, 0.45)",
      "stroke-width": 1.2,
      class: "graph-edge"
    });
    svg.appendChild(line);
  });

  // Nodes
  NODES.forEach(node => {
    const pos = POSITIONS[node.id];
    const isApp = node.type === "app";
    const m = METRICS[node.id];
    const fill = isApp ? "var(--node-app)" : riskColor(m.trueRisk);

    const circle = createSvgElement("circle", {
      cx: pos.x,
      cy: pos.y,
      r: isApp ? 15 : 13,
      fill: fill,
      stroke: isApp ? "var(--node-app-border)" : "rgba(255, 255, 255, 0.25)",
      "stroke-width": isApp ? 2 : 1.5,
      class: "graph-node",
      "data-id": node.id
    });

    circle.addEventListener("click", () => showNodeDetails(node.id));

    const label = createSvgElement("text", {
      x: pos.x,
      y: pos.y + 30,
      class: "node-label"
    });
    label.textContent = node.name;

    svg.appendChild(circle);
    svg.appendChild(label);
  });
}

function showNodeDetails(nodeId) {
  const panel = document.getElementById("graph-info-panel");
  if (!panel) return;

  const node = NODES.find(n => n.id === nodeId);
  if (!node) return;

  if (node.type === "app") {
    panel.innerHTML = `
      <div class="node-detail-content">
        <div class="node-detail-header">
          <span class="node-detail-name">${node.name}</span>
          <span class="node-type-badge">Application</span>
        </div>
        <p style="font-size:13px; color:var(--text-muted);">
          Primary software application entrypoint. Does not report individual CVE scores directly, but inherits vulnerabilities from packages in lower layers.
        </p>
        <div class="stat-grid">
          <div class="stat-box">
            <span class="stat-box-label">Layer</span>
            <span class="stat-box-val">0 (Top)</span>
          </div>
          <div class="stat-box">
            <span class="stat-box-label">Risk Profile</span>
            <span class="stat-box-val" style="color:var(--water-cyan);">Consumer</span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const m = METRICS[nodeId];
  const delta = m.trueRisk - node.vuln;
  const hiddenRiskWarning = delta >= 15
    ? `<div style="background:rgba(196,67,43,0.15); border:1px solid rgba(196,67,43,0.35); border-radius:8px; padding:10px; font-size:12px; color:#fca5a5; line-height:1.4;">
        ⚠️ <strong>Hidden Cascading Danger:</strong> Reported score (${node.vuln}) significantly underestimates true blast radius (${m.affectedCount} targets across ${m.affectedAppsCount} of ${TOTAL_APPS} apps).
       </div>`
    : "";

  panel.innerHTML = `
    <div class="node-detail-content">
      <div class="node-detail-header">
        <span class="node-detail-name">${node.name}</span>
        <span class="node-type-badge">Package</span>
      </div>

      <div class="stat-grid">
        <div class="stat-box">
          <span class="stat-box-label">Reported Vuln</span>
          <span class="stat-box-val">${node.vuln}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">True Risk Score</span>
          <span class="stat-box-val" style="color:${riskColor(m.trueRisk)}">${m.trueRisk}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Direct Dependents</span>
          <span class="stat-box-val">${m.directDependents}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Apps Reachable</span>
          <span class="stat-box-val">${m.affectedAppsCount} / ${TOTAL_APPS}</span>
        </div>
      </div>

      <div class="action-recommendation-box">
        <span class="legend-dot" style="background:${riskColor(m.trueRisk)}; color:${riskColor(m.trueRisk)};"></span>
        <span>${riskLabel(m.trueRisk)}</span>
      </div>

      ${hiddenRiskWarning}

      <button class="btn-simulate-jump" onclick="jumpToSimulation('${node.id}')">
        <span>Simulate Laser Propagation ↓</span>
      </button>
    </div>
  `;
}

window.jumpToSimulation = function (nodeId) {
  const target = document.getElementById("section-propagation");
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    simulateLaserPropagation(nodeId);
  }
};

// ==========================================================================
// 3. SECTION 02: VULNERABILITY SCOREBOARD
// ==========================================================================

function buildScoreboard() {
  const tbody = document.getElementById("scoreboard-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const ranked = NODES
    .filter(n => n.type === "package")
    .map(n => ({ node: n, m: METRICS[n.id] }))
    .sort((a, b) => b.m.trueRisk - a.m.trueRisk);

  ranked.forEach(({ node, m }) => {
    let scoreClass = "low";
    if (m.trueRisk >= 70) scoreClass = "crit";
    else if (m.trueRisk >= 52) scoreClass = "high";
    else if (m.trueRisk >= 35) scoreClass = "med";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="legend-dot ${scoreClass}" style="background:${riskColor(m.trueRisk)}; color:${riskColor(m.trueRisk)};"></span>
      </td>
      <td class="pkg-name-cell">${node.name}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${node.vuln}</td>
      <td>
        <span class="score-badge ${scoreClass}">${m.trueRisk}</span>
      </td>
      <td style="font-family:'JetBrains Mono',monospace;">${m.directDependents}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${m.affectedAppsCount} / ${TOTAL_APPS}</td>
      <td class="action-pill">${riskLabel(m.trueRisk)}</td>
      <td>
        <button class="btn-table-simulate" onclick="jumpToSimulation('${node.id}')">
          <span>Simulate →</span>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================================================
// 4. SECTION 03: PROPAGATION SIMULATOR & LASER CONDUITS
// ==========================================================================

function initPropagationControls() {
  const select = document.getElementById("prop-node-select");
  const btnTrigger = document.getElementById("btn-trigger-pulse");
  const btnReset = document.getElementById("btn-reset-sim");

  if (!select) return;
  select.innerHTML = `<option value="">Choose a package to compromise…</option>`;

  NODES.filter(n => n.type === "package").forEach(n => {
    const opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = `${n.name} (True Risk: ${METRICS[n.id].trueRisk})`;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    if (select.value) {
      simulateLaserPropagation(select.value);
    } else {
      resetPropagation();
    }
  });

  if (btnTrigger) {
    btnTrigger.addEventListener("click", () => {
      if (currentSimulationNode) {
        simulateLaserPropagation(currentSimulationNode);
      } else {
        // Default to highest risk node if none chosen
        const highestRisk = NODES.filter(n => n.type === "package").sort((a, b) => METRICS[b.id].trueRisk - METRICS[a.id].trueRisk)[0];
        if (highestRisk) simulateLaserPropagation(highestRisk.id);
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", resetPropagation);
  }
}

function resetPropagation() {
  // Clear any running timeouts
  activeLaserTimers.forEach(t => clearTimeout(t));
  activeLaserTimers = [];
  currentSimulationNode = null;

  const select = document.getElementById("prop-node-select");
  if (select) select.value = "";

  drawPropagationBaseGraph(null, new Map());

  const panel = document.getElementById("prop-info-panel");
  if (panel) {
    panel.innerHTML = `
      <div class="info-placeholder">
        Select a package above or click any node to simulate how a compromised vulnerability ripples upward through the dependency graph.
      </div>
    `;
  }
}

function drawPropagationBaseGraph(compromisedId, affectedDistances) {
  const svg = document.getElementById("propagation-graph");
  if (!svg) return;
  svg.innerHTML = "";

  const affectedIds = new Set(affectedDistances.keys());

  // Layer guidelines
  const layerNames = {
    0: "APPLICATIONS",
    1: "SERVICES & MID-TIER",
    2: "SHARED LIBRARIES",
    3: "DEEP CORE UTILITIES"
  };

  Object.keys(LAYER_Y).forEach(layer => {
    const y = LAYER_Y[layer];
    const guide = createSvgElement("line", {
      x1: 20, y1: y,
      x2: VIEW_WIDTH - 20, y2: y,
      stroke: "rgba(56, 189, 248, 0.05)",
      "stroke-dasharray": "4 6",
      "stroke-width": 1
    });
    const label = createSvgElement("text", {
      x: 30, y: y - 16,
      class: "layer-indicator-label"
    });
    label.textContent = layerNames[layer];
    svg.appendChild(guide);
    svg.appendChild(label);
  });

  // Conduit Edges
  EDGES.forEach(([fromId, toId]) => {
    const from = POSITIONS[fromId];
    const to = POSITIONS[toId];

    const isTainted = compromisedId &&
      (fromId === compromisedId || affectedIds.has(fromId)) &&
      (toId === compromisedId || affectedIds.has(toId));

    const line = createSvgElement("line", {
      x1: from.x, y1: from.y + 15,
      x2: to.x, y2: to.y - 15,
      class: `conduit-edge ${isTainted ? 'tainted' : ''}`,
      id: `edge-${toId}-${fromId}`
    });
    svg.appendChild(line);
  });

  // Nodes
  NODES.forEach(node => {
    const pos = POSITIONS[node.id];
    const isApp = node.type === "app";
    const isCompromisedOrigin = node.id === compromisedId;
    const isAffected = affectedIds.has(node.id);

    let fill = isApp ? "var(--node-app)" : riskColor(METRICS[node.id].trueRisk);
    let stroke = isApp ? "var(--node-app-border)" : "rgba(255, 255, 255, 0.25)";

    if (isCompromisedOrigin) {
      fill = "#ffffff";
      stroke = "var(--water-cyan-bright)";
    } else if (isAffected) {
      fill = "#c4432b";
      stroke = "#fca5a5";
    } else if (compromisedId) {
      // Unaffected dimmed nodes
      fill = "#141824";
      stroke = "rgba(71, 85, 105, 0.3)";
    }

    // Origin pulsing shockwave
    if (isCompromisedOrigin) {
      const aura = createSvgElement("circle", {
        cx: pos.x,
        cy: pos.y,
        r: 16,
        class: "pulse-origin-aura"
      });
      svg.appendChild(aura);
    }

    const circle = createSvgElement("circle", {
      cx: pos.x,
      cy: pos.y,
      r: isApp ? 15 : 13,
      fill: fill,
      stroke: stroke,
      "stroke-width": isCompromisedOrigin ? 3 : (isApp ? 2 : 1.5),
      class: "graph-node",
      id: `prop-node-${node.id}`
    });

    circle.addEventListener("click", () => {
      if (node.type === "package") {
        simulateLaserPropagation(node.id);
      }
    });

    const label = createSvgElement("text", {
      x: pos.x,
      y: pos.y + 30,
      class: "node-label",
      style: (compromisedId && !isCompromisedOrigin && !isAffected) ? "fill:#475569;" : ""
    });
    label.textContent = node.name;

    svg.appendChild(circle);
    svg.appendChild(label);
  });
}

/**
 * Laser Pulse Simulation Engine
 * Executes sequential hop-by-hop laser energy packet traversals
 */
function simulateLaserPropagation(startId) {
  currentSimulationNode = startId;

  // Sync dropdown selector
  const select = document.getElementById("prop-node-select");
  if (select && select.value !== startId) {
    select.value = startId;
  }

  // Clear previous timers
  activeLaserTimers.forEach(t => clearTimeout(t));
  activeLaserTimers = [];

  const node = NODES.find(n => n.id === startId);
  const affected = propagate(startId);

  // Group nodes and edges by hop distance
  const hopGroups = {};
  affected.forEach((hop, id) => {
    if (!hopGroups[hop]) hopGroups[hop] = [];
    hopGroups[hop].push(id);
  });

  const maxHop = Math.max(0, ...Object.keys(hopGroups).map(Number));

  // Render initial base graph with origin node active
  drawPropagationBaseGraph(startId, new Map());

  // Trigger water drop canvas wave at center
  if (typeof window.triggerWaterDrop === "function") {
    const startPos = POSITIONS[startId];
    window.triggerWaterDrop(window.innerWidth * (startPos.x / VIEW_WIDTH), window.innerHeight * 0.7, 0.7);
  }

  const svg = document.getElementById("propagation-graph");

  // Animate hop waves sequentially
  const hopDelay = 600; // ms per hop

  for (let hop = 1; hop <= maxHop; hop++) {
    const prevHopNodes = (hop === 1) ? [startId] : (hopGroups[hop - 1] || []);
    const currentHopNodes = hopGroups[hop] || [];

    // Find all edges from prevHopNodes to currentHopNodes
    const activeEdges = [];
    prevHopNodes.forEach(prevId => {
      DEPENDENTS[prevId].forEach(depId => {
        if (currentHopNodes.includes(depId)) {
          activeEdges.push({ from: prevId, to: depId });
        }
      });
    });

    // Schedule laser pulse for this hop
    const timer = setTimeout(() => {
      activeEdges.forEach(({ from, to }) => {
        fireLaserPulse(svg, from, to);
      });

      // After pulse arrives (~400ms), illuminate destination nodes
      const arrivalTimer = setTimeout(() => {
        currentHopNodes.forEach(nodeId => {
          illuminateNode(svg, nodeId);
        });
      }, 420);
      activeLaserTimers.push(arrivalTimer);

    }, (hop - 1) * hopDelay + 200);

    activeLaserTimers.push(timer);
  }

  // Update simulator info panel
  updatePropagationPanel(node, affected, hopGroups);
}

function fireLaserPulse(svg, fromId, toId) {
  if (!svg) return;
  const from = POSITIONS[fromId];
  const to = POSITIONS[toId];

  // Energize conduit edge
  const edgeEl = document.getElementById(`edge-${fromId}-${toId}`);
  if (edgeEl) {
    edgeEl.classList.add("laser-active");
    edgeEl.classList.add("tainted");
  }

  // Create laser photon projectile
  const photon = createSvgElement("circle", {
    cx: from.x,
    cy: from.y - 15,
    r: 4.5,
    class: "laser-photon"
  });
  svg.appendChild(photon);

  const startTime = performance.now();
  const duration = 400; // ms

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Smooth ease-in-out trajectory
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    const curX = from.x + (to.x - from.x) * ease;
    const curY = (from.y - 15) + ((to.y + 15) - (from.y - 15)) * ease;

    photon.setAttribute("cx", curX);
    photon.setAttribute("cy", curY);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      photon.remove();
    }
  }

  requestAnimationFrame(animate);
}

function illuminateNode(svg, nodeId) {
  const nodeEl = document.getElementById(`prop-node-${nodeId}`);
  const pos = POSITIONS[nodeId];

  if (nodeEl) {
    nodeEl.setAttribute("fill", "#c4432b");
    nodeEl.setAttribute("stroke", "#fca5a5");
    nodeEl.setAttribute("stroke-width", "2.5");
  }

  // Impact burst ring
  if (svg && pos) {
    const burst = createSvgElement("circle", {
      cx: pos.x,
      cy: pos.y,
      r: 14,
      class: "node-impact-burst"
    });
    svg.appendChild(burst);
    setTimeout(() => burst.remove(), 700);
  }
}

function updatePropagationPanel(node, affected, hopGroups) {
  const panel = document.getElementById("prop-info-panel");
  if (!panel) return;

  const affectedApps = [...affected.keys()].filter(id => NODES.find(n => n.id === id).type === "app");

  let hopHtml = "";
  Object.keys(hopGroups).sort((a, b) => a - b).forEach(hop => {
    const nodeNames = hopGroups[hop].map(id => {
      const n = NODES.find(item => item.id === id);
      const isApp = n.type === "app";
      return `<span style="${isApp ? 'color:var(--water-cyan);font-weight:700;' : ''}">${n.name}${isApp ? ' (App)' : ''}</span>`;
    });

    hopHtml += `
      <div class="hop-item-card">
        <div class="hop-header">
          <span class="hop-badge">Hop 0${hop}</span>
          <span style="font-size:11px; color:var(--text-dim);">${hopGroups[hop].length} target(s) reached</span>
        </div>
        <div class="hop-node-tags">${nodeNames.join(", ")}</div>
      </div>
    `;
  });

  panel.innerHTML = `
    <div class="node-detail-content">
      <div class="node-detail-header">
        <span class="node-detail-name" style="color:#ffffff;">Origin: ${node.name}</span>
        <span class="node-type-badge" style="background:rgba(196,67,43,0.2); color:#fca5a5; border-color:rgba(196,67,43,0.4);">COMPROMISED</span>
      </div>

      <div class="stat-grid">
        <div class="stat-box">
          <span class="stat-box-label">Blast Radius</span>
          <span class="stat-box-val" style="color:#fca5a5;">${affected.size} targets</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Apps Breached</span>
          <span class="stat-box-val" style="color:#f87171;">${affectedApps.length} / ${TOTAL_APPS}</span>
        </div>
      </div>

      <div style="font-size:12px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-top:6px;">
        Propagation Conduit Sequence
      </div>

      <div class="hop-breakdown-list">
        ${hopHtml || '<div style="color:var(--text-dim);font-size:12px;">No downstream dependents affected.</div>'}
      </div>
    </div>
  `;
}

// ==========================================================================
// 5. SECTION 04: AI FIX RECOMMENDATION
// ==========================================================================

function initAIFixControls() {
  const select = document.getElementById("fix-node-select");
  const btnGenerate = document.getElementById("btn-generate-fix");
  const resultsPanel = document.getElementById("ai-fix-results");

  if (!select) return;
  select.innerHTML = `<option value="">Choose a package to analyze…</option>`;

  NODES.filter(n => n.type === "package").forEach(n => {
    const opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = `${n.name} (Reported Vuln: ${n.vuln})`;
    select.appendChild(opt);
  });

  if (btnGenerate) {
    btnGenerate.addEventListener("click", () => {
      const nodeId = select.value;
      if (!nodeId) {
        alert("Please select a package to analyze.");
        return;
      }
      generateAIFix(nodeId, resultsPanel);
    });
  }
}

function generateAIFix(nodeId, resultsPanel) {
  const node = NODES.find(n => n.id === nodeId);
  if (!node) return;

  resultsPanel.style.display = "block";
  resultsPanel.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; color:var(--water-cyan);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 2s linear infinite;">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <span>AI Agent retrieving live OSV vulnerability details for <strong>${node.name}</strong>...</span>
    </div>
  `;

  setTimeout(() => {
    const vulns = window.OSV_DETAILS && window.OSV_DETAILS[nodeId] ? window.OSV_DETAILS[nodeId] : [];
    
    let errorText = "No known vulnerabilities found in OSV database.";
    let fixText = "You are safe! No action required.";
    let errorColor = "#34d399";
    let fixColor = "#34d399";
    let errorBg = "rgba(52, 211, 153, 0.1)";
    let errorBorder = "rgba(52, 211, 153, 0.3)";
    let iconColor = "#34d399";

    if (vulns.length > 0) {
      const vuln = vulns[0];
      errorText = vuln.summary || vuln.details || "Unknown vulnerability type detected.";
      const aliases = vuln.aliases ? ` (Aliases: ${vuln.aliases.join(", ")})` : "";
      errorText = `${errorText}${aliases}`;
      
      const fixVersions = vuln.affected && vuln.affected[0] && vuln.affected[0].ranges && vuln.affected[0].ranges[0] && vuln.affected[0].ranges[0].events 
        ? vuln.affected[0].ranges[0].events.map(e => e.fixed).filter(Boolean) : [];
        
      if (fixVersions.length > 0) {
        fixText = `<strong>Update Version:</strong> Upgrade ${node.name} to version ${fixVersions[0]} which contains the official security patch.`;
      } else {
        fixText = `<strong>Apply Workaround or Remove:</strong> No patched version found in OSV record. Consider migrating to an alternative library or applying input validation manually.`;
      }
      
      errorColor = "#fca5a5";
      errorBg = "rgba(248, 113, 113, 0.1)";
      errorBorder = "rgba(248, 113, 113, 0.3)";
      iconColor = "#f87171";
    }

    resultsPanel.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="color:var(--text-bright); font-size: 16px; margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Detected Error (OSV Match)
        </h3>
        <div style="background:${errorBg}; border:1px solid ${errorBorder}; border-radius:8px; padding:16px; color:${errorColor}; font-size:14px; line-height:1.5;">
          <strong>Vulnerability:</strong> ${errorText}<br/>
          <strong style="display:inline-block; margin-top:8px;">Package:</strong> ${node.name} (True Risk Score: ${METRICS[nodeId] ? METRICS[nodeId].trueRisk : 0})
        </div>
      </div>
      
      <div>
        <h3 style="color:var(--text-bright); font-size: 16px; margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2">
            <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"></path>
          </svg>
          AI Recommended Fix
        </h3>
        <div style="background:rgba(52, 211, 153, 0.1); border:1px solid rgba(52, 211, 153, 0.3); border-radius:8px; padding:16px; color:#6ee7b7; font-size:14px; line-height:1.5;">
          ${fixText}
        </div>
      </div>
    `;
  }, 1000);
}

// ==========================================================================
// 6. INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  initUploadArea();
  drawDependencyGraph();
  buildScoreboard();
  initPropagationControls();
  initAIFixControls();
  drawPropagationBaseGraph(null, new Map());
});
