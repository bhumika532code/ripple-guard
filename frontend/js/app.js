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

// New global state for Threat Intel
window.SEVERITY_DIST = null;
window.DIRECT_VS_TRANSITIVE = null;
window.VULN_TRACES = null;
window.SMART_FIXES = null;

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

  // Max 10 MB
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    if (uploadTitle) uploadTitle.textContent = `File too large: ${file.name}`;
    if (uploadSub) uploadSub.textContent = `Maximum file size is 10 MB.`;
    return;
  }

  if (uploadTitle) uploadTitle.textContent = `Analyzing ${file.name}...`;
  if (uploadSub) uploadSub.innerHTML = `<span style="color:#38bdf8;">Querying real OSV Vulnerability Database...</span>`;

  const formData = new FormData();
  formData.append('manifestFile', file);
  formData.append('originalName', file.name);

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Backend analysis failed');
    }

    const data = await response.json();

    // Update global state
    NODES = data.nodes;
    EDGES = data.edges;
    window.OSV_DETAILS = data.osvDetails || {};
    window.SEVERITY_DIST = data.severityDist || null;
    window.DIRECT_VS_TRANSITIVE = data.directVsTransitive || null;
    window.VULN_TRACES = data.vulnTraces || null;
    window.SMART_FIXES = data.smartFixes || null;
    window.FIXED_MANIFEST = data.fixedManifest || null;

    if (uploadTitle) uploadTitle.textContent = `Project Loaded: ${file.name}`;
    const sourcesUsed = (data.sources || ['OSV']).join(' + ');
    if (uploadSub) uploadSub.innerHTML = `<span style="color:#22c55e;">✔ Analyzed ${NODES.length} nodes (${data.ecosystem || 'auto-detected'}) via ${sourcesUsed}</span>`;

    // Re-initialize UI with new data
    initEcosystemState();
    drawDependencyGraph();
    buildScoreboard();
    if (typeof buildThreatIntelDashboard === 'function') buildThreatIntelDashboard();
    initPropagationControls();
    initAIFixControls();
    if (typeof buildCombinedOverview === 'function') buildCombinedOverview();
    resetPropagation();
    
    // Save state to sessionStorage for PRO tab
    sessionStorage.setItem('dominode_nodes', JSON.stringify(NODES));
    sessionStorage.setItem('dominode_edges', JSON.stringify(EDGES));
    sessionStorage.setItem('dominode_osv', JSON.stringify(window.OSV_DETAILS));
    sessionStorage.setItem('dominode_filename', file.name);

  } catch (err) {
    console.error(err);
    if (uploadTitle) uploadTitle.textContent = `Error analyzing ${file.name}`;
    if (uploadSub) uploadSub.textContent = err.message || `Make sure the local backend is running on port 3000.`;
  }
}

// ==========================================================================
// 2. SECTION 01: DEPENDENCY GRAPH
// ==========================================================================

function drawDependencyGraph() {
  const svg = document.getElementById("graph");
  if (!svg) return;
  svg.innerHTML = "";



  // Edges
  EDGES.forEach(([fromId, toId]) => {
    const from = POSITIONS[fromId];
    const to = POSITIONS[toId];

    const line = createSvgElement("line", {
      x1: from.x, y1: from.y,
      x2: to.x, y2: to.y,
      stroke: "rgba(71, 85, 105, 0.45)",
      "stroke-width": 1.2,
      class: "graph-edge",
      "data-from": fromId,
      "data-to": toId
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

    const title = createSvgElement("title", {});
    if (isApp) {
      title.textContent = `Application: ${node.name}\nTop-level consumer inheriting downstream risk.`;
    } else {
      const osv = window.OSV_DETAILS ? window.OSV_DETAILS[node.id] : null;
      let desc = node.description || "Dependency Package";
      if (osv && osv.length > 0) {
        desc = osv[0].summary || osv[0].details || osv[0].description || desc;
      }
      // Truncate overly long descriptions for tooltip readability
      if (desc.length > 200) desc = desc.substring(0, 197) + "...";
      title.textContent = `${node.name}\n${desc}\n\nReported Vuln: ${node.vuln} | True Risk: ${m.trueRisk}`;
    }
    circle.appendChild(title);

    circle.addEventListener("click", () => {
      simulateLaserPropagation(node.id);
    });

    const isStaggeredUp = pos.y < LAYER_Y[node.layer];
    const label = createSvgElement("text", {
      x: pos.x,
      y: isStaggeredUp ? pos.y - 22 : pos.y + 35,
      class: "node-label",
      "data-id": node.id
    });
    label.textContent = node.name;

    svg.appendChild(circle);
    svg.appendChild(label);
  });

  // Enable drag and drop for nodes
  let draggedNode = null;
  let dragOffset = { x: 0, y: 0 };
  let isDragging = false;

  svg.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'circle') {
      draggedNode = e.target;
      isDragging = false;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      
      const cx = parseFloat(draggedNode.getAttribute('cx'));
      const cy = parseFloat(draggedNode.getAttribute('cy'));
      dragOffset.x = svgP.x - cx;
      dragOffset.y = svgP.y - cy;
    }
  });

  svg.addEventListener('mousemove', (e) => {
    if (draggedNode) {
      if (!isDragging) {
        isDragging = true;
        // Bring to front ONLY when we actually start moving
        svg.appendChild(draggedNode);
        const id = draggedNode.getAttribute('data-id');
        const label = svg.querySelector(`text[data-id="${id}"]`);
        if (label) svg.appendChild(label);
      }

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
      
      const newX = svgP.x - dragOffset.x;
      const newY = svgP.y - dragOffset.y;
      
      draggedNode.setAttribute('cx', newX);
      draggedNode.setAttribute('cy', newY);
      
      const id = draggedNode.getAttribute('data-id');
      const label = svg.querySelector(`text[data-id="${id}"]`);
      if (label) {
        label.setAttribute('x', newX);
        label.setAttribute('y', newY + 30);
      }
      
      svg.querySelectorAll(`line[data-from="${id}"]`).forEach(line => {
        line.setAttribute('x1', newX);
        line.setAttribute('y1', newY);
      });
      svg.querySelectorAll(`line[data-to="${id}"]`).forEach(line => {
        line.setAttribute('x2', newX);
        line.setAttribute('y2', newY);
      });
    }
  });

  svg.addEventListener('mouseup', () => {
    if (draggedNode) {
      const id = draggedNode.getAttribute('data-id');
      POSITIONS[id].x = parseFloat(draggedNode.getAttribute('cx'));
      POSITIONS[id].y = parseFloat(draggedNode.getAttribute('cy'));
      draggedNode = null;
    }
  });

  svg.addEventListener('mouseleave', () => {
    draggedNode = null;
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
        <span>Run Taint Analysis ↓</span>
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
          <span>Taint Analysis →</span>
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

  dimGraphForSimulation(null, new Map());

  const panel = document.getElementById("prop-info-panel");
  if (panel) {
    panel.innerHTML = `
      <div class="info-placeholder">
        Select a package above or click any node to run a taint analysis to see how a compromised vulnerability ripples upward through the dependency graph.
      </div>
    `;
  }
}

function dimGraphForSimulation(compromisedId, affectedDistances) {
  const svg = document.getElementById("graph");
  if (!svg) return;
  const affectedIds = new Set(affectedDistances.keys());

  // Nodes
  NODES.forEach(node => {
    const circle = svg.querySelector(`circle[data-id="${node.id}"]`);
    const label = svg.querySelector(`text[data-id="${node.id}"]`);
    if (!circle) return;

    const isApp = node.type === "app";
    const isCompromisedOrigin = node.id === compromisedId;
    const isAffected = affectedIds.has(node.id);

    let fill = isApp ? "var(--node-app)" : riskColor(METRICS[node.id].trueRisk);
    let stroke = isApp ? "var(--node-app-border)" : "rgba(255, 255, 255, 0.25)";
    let labelFill = null;
    let opacity = "1";

    if (isCompromisedOrigin) {
      fill = "#ffffff";
      stroke = "var(--water-cyan-bright)";
      circle.setAttribute("stroke-width", "3");

      // Add aura if not exists
      if (!svg.querySelector(`.pulse-origin-aura[data-id="${node.id}"]`)) {
        const pos = POSITIONS[node.id];
        const aura = createSvgElement("circle", {
          cx: pos.x, cy: pos.y, r: 16, class: "pulse-origin-aura", "data-id": node.id
        });
        svg.insertBefore(aura, circle);
      }
    } else if (isAffected) {
      fill = "#c4432b";
      stroke = "#fca5a5";
    } else if (compromisedId) {
      opacity = "0.2";
      labelFill = "#475569";
    }

    circle.setAttribute("fill", fill);
    circle.setAttribute("stroke", stroke);
    circle.style.opacity = opacity;
    if (label && labelFill) label.style.fill = labelFill;
    else if (label) label.style.fill = "";
  });

  // Dim edges
  EDGES.forEach(([fromId, toId]) => {
    const line = svg.querySelector(`line[data-from="${fromId}"][data-to="${toId}"]`);
    if (line) {
      line.style.stroke = "";
      line.style.strokeWidth = "";
      line.style.filter = "";
      line.classList.remove("conduit-edge", "tainted", "laser-active");
    }
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
  dimGraphForSimulation(startId, affected);

  // Trigger water drop canvas wave at center
  if (typeof window.triggerWaterDrop === "function") {
    const startPos = POSITIONS[startId];
    window.triggerWaterDrop(window.innerWidth * (startPos.x / VIEW_WIDTH), window.innerHeight * 0.7, 0.7);
  }

  const svg = document.getElementById("graph");

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

  // Draw an instant laser strike from A to B (white core, massive blue glow)
  const laser = createSvgElement("line", {
    x1: from.x, y1: from.y,
    x2: to.x, y2: to.y,
    stroke: "#ffffff",
    "stroke-width": 5,
    "stroke-linecap": "round",
    style: "filter: drop-shadow(0 0 15px #00e5ff) drop-shadow(0 0 30px #00e5ff); transition: opacity 0.25s ease-out;"
  });
  svg.appendChild(laser);

  // Fade out the laser flash shortly after striking
  setTimeout(() => {
    laser.style.opacity = "0";
    setTimeout(() => laser.remove(), 250);
  }, 100);

  // Permanently highlight the conduit edge with a bright neon blue glow
  const edgeEl = svg.querySelector(`line[data-from="${fromId}"][data-to="${toId}"]`);
  if (edgeEl) {
    setTimeout(() => {
      edgeEl.style.stroke = "#00e5ff";
      edgeEl.style.strokeWidth = "3.5";
      edgeEl.style.filter = "drop-shadow(0 0 12px #00e5ff) drop-shadow(0 0 24px #38bdf8)";
    }, 50);
  }
}

function illuminateNode(svg, nodeId) {
  const nodeEl = svg.querySelector(`circle[data-id="${nodeId}"]`);
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
  const panel = document.getElementById("graph-info-panel");
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
// 5. SECTION 03: THREAT INTELLIGENCE DASHBOARD
// ==========================================================================

function buildThreatIntelDashboard() {
  if (!window.SEVERITY_DIST) return;

  // 1. Severity Distribution
  const sevContainer = document.getElementById("severity-dist-container");
  if (sevContainer) {
    const total = Object.values(window.SEVERITY_DIST).reduce((a, b) => a + b, 0);
    const renderBar = (label, count, className) => {
      const pct = total > 0 ? (count / total) * 100 : 0;
      return `
        <div class="severity-bar-row">
          <span class="severity-bar-label ${className}">${label}</span>
          <div class="severity-bar-track">
            <div class="severity-bar-fill ${className}" style="width: ${pct}%"></div>
          </div>
          <span class="severity-bar-count">${count}</span>
        </div>
      `;
    };

    sevContainer.innerHTML = `
      ${renderBar("CRITICAL", window.SEVERITY_DIST.CRITICAL, "critical")}
      ${renderBar("HIGH", window.SEVERITY_DIST.HIGH, "high")}
      ${renderBar("MEDIUM", window.SEVERITY_DIST.MEDIUM, "medium")}
      ${renderBar("LOW", window.SEVERITY_DIST.LOW, "low")}
      <div class="severity-total-row">
        <span class="severity-total-label">Total Vulnerabilities</span>
        <span class="severity-total-val">${total}</span>
      </div>
    `;
  }

  // 2. Direct vs Transitive
  const dtContainer = document.getElementById("direct-transitive-container");
  if (dtContainer && window.DIRECT_VS_TRANSITIVE) {
    const dt = window.DIRECT_VS_TRANSITIVE;
    const totalVulns = dt.direct + dt.transitive;
    const directPct = totalVulns > 0 ? (dt.direct / totalVulns) * 100 : 50;
    const transPct = totalVulns > 0 ? (dt.transitive / totalVulns) * 100 : 50;

    dtContainer.innerHTML = `
      <div class="dt-stat-row">
        <div class="dt-stat-box">
          <span class="dt-stat-box-label">Direct Vulns</span>
          <span class="dt-stat-box-val direct">${dt.direct}</span>
          <div class="dt-stat-box-sub">in ${dt.directPackages} packages</div>
        </div>
        <div class="dt-stat-box">
          <span class="dt-stat-box-label">Transitive Vulns</span>
          <span class="dt-stat-box-val transitive">${dt.transitive}</span>
          <div class="dt-stat-box-sub">in ${dt.transitivePackages} packages</div>
        </div>
      </div>
      <div style="margin-top: 8px;">
        <div class="dt-comparison-bar">
          <div class="dt-bar-direct" style="width: ${directPct}%"></div>
          <div class="dt-bar-transitive" style="width: ${transPct}%"></div>
        </div>
        <div class="dt-bar-legend">
          <div class="dt-legend-item">
            <span class="dt-legend-dot direct"></span>
            <span>Direct Dependency (${Math.round(directPct)}%)</span>
          </div>
          <div class="dt-legend-item">
            <span class="dt-legend-dot transitive"></span>
            <span>Transitive (Indirect) (${Math.round(transPct)}%)</span>
          </div>
        </div>
      </div>
    `;
  }

  // 3. Vulnerability Trace Paths
  const tracesContainer = document.getElementById("trace-paths-container");
  if (tracesContainer && window.VULN_TRACES) {
    if (Object.keys(window.VULN_TRACES).length === 0) {
      tracesContainer.innerHTML = `<div class="no-vulns-message">No dependency vulnerabilities found!</div>`;
    } else {
      let html = '';
      for (const [vulnId, path] of Object.entries(window.VULN_TRACES)) {
        // Find highest severity for this package
        const vulns = window.OSV_DETAILS[vulnId] || [];
        let maxSev = "LOW";
        if (vulns.some(v => v.severity === 'CRITICAL')) maxSev = "CRITICAL";
        else if (vulns.some(v => v.severity === 'HIGH')) maxSev = "HIGH";
        else if (vulns.some(v => v.severity === 'MEDIUM')) maxSev = "MEDIUM";

        let pathHtml = '';
        path.forEach((node, i) => {
          if (i > 0) {
            pathHtml += `
              <span class="trace-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            `;
          }
          let nodeClass = "mid-node";
          if (i === 0) nodeClass = "app-node";
          if (i === path.length - 1) nodeClass = "vuln-node";
          pathHtml += `<span class="trace-node ${nodeClass}">${node}</span>`;
        });

        html += `
          <div class="trace-path-item">
            ${pathHtml}
            <span class="trace-vuln-badge ${maxSev.toLowerCase()}">${maxSev}</span>
          </div>
        `;
      }
      tracesContainer.innerHTML = html;
    }
  }
}

// ==========================================================================
// 6. SECTION 05: SMART FIX RECOMMENDATIONS (DTReme)
// ==========================================================================

function initAIFixControls() {
  const select = document.getElementById("fix-node-select");
  const btnGenerate = document.getElementById("btn-generate-fix");
  const resultsPanel = document.getElementById("ai-fix-results");
  const toggleBtn = document.getElementById("smart-fix-toggle");
  const toolbox = document.getElementById("smart-fix-toolbox");

  if (toggleBtn && toolbox) {
    toggleBtn.addEventListener("click", () => {
      toolbox.classList.toggle("closed");
    });
  }

  if (!select) return;
  select.innerHTML = `<option value="">Choose a direct dependency to analyze…</option>`;

  // Only allow selecting direct dependencies for smart fixes
  NODES.filter(n => n.layer === 1).forEach(n => {
    const opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = `${n.name}`;
    select.appendChild(opt);
  });

  if (btnGenerate) {
    btnGenerate.addEventListener("click", () => {
      const nodeId = select.value;
      if (!nodeId) {
        // If no node selected, show the best recommendation automatically
        if (window.SMART_FIXES && window.SMART_FIXES.length > 0) {
          generateAIFix(window.SMART_FIXES[0].dep, resultsPanel);
          select.value = window.SMART_FIXES[0].dep;
        } else {
          alert("Please select a direct dependency to analyze, or ensure the ecosystem has vulnerabilities.");
        }
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
      <span>Analyzing propagation trees for <strong>${node.name}</strong>...</span>
    </div>
  `;

  setTimeout(() => {
    // Find smart fix for this node
    const smartFix = (window.SMART_FIXES || []).find(f => f.dep === nodeId);

    if (!smartFix) {
      resultsPanel.innerHTML = `
        <div class="no-vulns-message">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <strong>${node.name}</strong> is healthy.<br>
          Upgrading this dependency will not fix any known vulnerabilities in your tree.
        </div>
      `;
      return;
    }

    // Build impact badges
    let impactHtml = '';
    if (smartFix.severityBreakdown.CRITICAL > 0) impactHtml += `<span class="trace-vuln-badge critical">${smartFix.severityBreakdown.CRITICAL} CRITICAL</span> `;
    if (smartFix.severityBreakdown.HIGH > 0) impactHtml += `<span class="trace-vuln-badge high">${smartFix.severityBreakdown.HIGH} HIGH</span> `;

    // Build fix urgency badge
    let urgencyHtml = '';
    if (smartFix.fixLagDays !== null) {
      const days = smartFix.fixLagDays;
      if (days > 180) urgencyHtml = `<span class="fix-lag-badge urgent">⚠ Fix available ${days} days ago — Patch Overdue</span>`;
      else if (days > 30) urgencyHtml = `<span class="fix-lag-badge warning">Fix available ${days} days ago</span>`;
      else urgencyHtml = `<span class="fix-lag-badge info">Recent fix (${days} days ago)</span>`;
    }

    const actionText = smartFix.fixVersion
      ? `Upgrade <strong>${node.name}</strong> to version <strong>${smartFix.fixVersion}</strong>`
      : `Update <strong>${node.name}</strong> to latest stable version`;

    resultsPanel.innerHTML = `
      <div class="smart-fix-card">
        <div class="smart-fix-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="smart-fix-pkg-name">${node.name}</span>
            ${urgencyHtml}
          </div>
          <span class="smart-fix-impact-badge">
            Eliminates ${smartFix.totalFixable} Vulnerabilities
          </span>
        </div>

        <div class="smart-fix-stats">
          <div class="smart-fix-stat">
            <span class="smart-fix-stat-label">Direct Vulns Fixed</span>
            <span class="smart-fix-stat-val" style="color: #f97316;">${smartFix.ownVulnCount}</span>
          </div>
          <div class="smart-fix-stat">
            <span class="smart-fix-stat-label">Transitive Vulns Fixed</span>
            <span class="smart-fix-stat-val" style="color: #a78bfa;">${smartFix.transitiveVulnCount}</span>
          </div>
          <div class="smart-fix-stat">
            <span class="smart-fix-stat-label">Highest Impact</span>
            <div style="margin-top: 2px;">${impactHtml || '<span class="trace-vuln-badge medium">MEDIUM</span>'}</div>
          </div>
        </div>

        <div class="smart-fix-action">
          <svg class="smart-fix-action-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22V8M5 15l7-7 7 7"/>
          </svg>
          <span class="smart-fix-action-text">${actionText}</span>
        </div>

        ${smartFix.affectedTransitives.length > 0 ? `
          <div class="smart-fix-transitives">
            This single upgrade resolves transitive vulnerabilities in: 
            <strong>${smartFix.affectedTransitives.join(', ')}</strong>
          </div>
        ` : ''}
      </div>
    `;
  }, 600);
}

// ==========================================================================
// 7. SECTION 06: COMBINED OVERVIEW TOOLBOX
// ==========================================================================

function buildCombinedOverview() {
  const toolbox = document.getElementById("combined-overview-toolbox");
  const toggleBtn = document.getElementById("combined-overview-toggle");
  const content = document.getElementById("combined-overview-content");

  if (toggleBtn && toolbox && !toggleBtn.hasListener) {
    toggleBtn.addEventListener("click", () => {
      toolbox.classList.toggle("closed");
    });
    toggleBtn.hasListener = true;
  }

  if (!content) return;

  if (!window.SEVERITY_DIST || !NODES || NODES.length === 0) {
    content.innerHTML = `<div class="intel-placeholder" style="padding: 10px 0;">Upload a manifest to view combined stats</div>`;
    return;
  }

  // Calculate highest risk score
  let maxRisk = 0;
  Object.values(METRICS).forEach(m => {
    if (m.trueRisk > maxRisk) maxRisk = m.trueRisk;
  });

  // Get Top 3 Threats
  const allNodes = NODES.filter(n => n.type === 'package').sort((a, b) => METRICS[b.id].trueRisk - METRICS[a.id].trueRisk);
  const topThreats = allNodes.slice(0, 3);

  let threatsHtml = '';
  topThreats.forEach(n => {
    const risk = METRICS[n.id].trueRisk;
    if (risk > 0) {
      threatsHtml += `
        <div class="overview-threat-item">
          <span>${n.name}</span>
          <span style="color: #fca5a5; font-family: 'JetBrains Mono', monospace;">${risk.toFixed(1)}</span>
        </div>
      `;
    }
  });

  if (!threatsHtml) {
    threatsHtml = `<div style="font-size: 11px; color: #34d399;">No active threats found.</div>`;
  }

  // Get Top Fix Recommendation
  let topFixHtml = `<div style="font-size: 11px; color: var(--text-dim);">No fixes available</div>`;
  if (window.SMART_FIXES && window.SMART_FIXES.length > 0) {
    const topFix = window.SMART_FIXES[0];
    const node = NODES.find(n => n.id === topFix.dep);
    if (node) {
      topFixHtml = `
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px; border-radius: 6px; margin-top: 8px;">
          <div style="font-size: 11px; color: #34d399; margin-bottom: 2px;">Recommended Action</div>
          <div style="font-size: 12px; color: var(--text-bright);">Upgrade <strong>${node.name}</strong></div>
          <div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">Fixes ${topFix.totalFixable} vulnerabilities</div>
        </div>
      `;
    }
  }

  content.innerHTML = `
    <div class="overview-grid">
      <div class="overview-stat-box">
        <span class="overview-stat-label">Packages</span>
        <span class="overview-stat-val">${NODES.filter(n => n.type === 'package').length}</span>
      </div>
      <div class="overview-stat-box">
        <span class="overview-stat-label">Max Risk</span>
        <span class="overview-stat-val" style="color: #fca5a5;">${maxRisk.toFixed(1)}</span>
      </div>
    </div>
    
    <div class="overview-list-title">Top Threats</div>
    <div style="margin-bottom: 12px;">
      ${threatsHtml}
    </div>
    
    ${topFixHtml}
  `;

  // Auto-open toolbox on load if there are threats
  if (maxRisk > 0 && toolbox.classList.contains("closed")) {
    toolbox.classList.remove("closed");
  }
}

// ==========================================================================
// 8. INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  initUploadArea();
  drawDependencyGraph();
  buildScoreboard();
  if (typeof buildThreatIntelDashboard === 'function') buildThreatIntelDashboard();
  initPropagationControls();
  initAIFixControls();
  if (typeof buildCombinedOverview === 'function') buildCombinedOverview();
  drawPropagationBaseGraph(null, new Map());
});
