function getNodeFromUrl() {
  return new URLSearchParams(window.location.search).get("node");
}

let compromisedId = getNodeFromUrl() || null;

function populateDropdown() {
  const select = document.getElementById("node-select");
  if (!select) return;

  NODES.filter(n => n.type === "package").forEach(n => {
    const option = document.createElement("option");
    option.value = n.id;
    option.textContent = `${n.name} (True Risk: ${METRICS[n.id].trueRisk})`;
    if (n.id === compromisedId) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    compromisedId = select.value || null;
    drawGraph();
    updateInfoPanel();
  });
}

function drawGraph() {
  const svg = document.getElementById("graph");
  if (!svg) return;
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
      x1: from.x, y1: from.y + 15,
      x2: to.x, y2: to.y - 15,
      class: `conduit-edge ${isTaintedEdge ? 'tainted laser-active' : ''}`
    });
    svg.appendChild(line);
  });

  NODES.forEach(node => {
    const pos = POSITIONS[node.id];
    const isApp = node.type === "app";
    const isOrigin = node.id === compromisedId;
    const isAffected = affectedIds.has(node.id);

    let fill = isApp ? "var(--node-app)" : riskColor(METRICS[node.id].trueRisk);
    let stroke = isApp ? "var(--node-app-border)" : "rgba(255, 255, 255, 0.25)";

    if (isOrigin) {
      fill = "#ffffff";
      stroke = "var(--water-cyan-bright)";

      const aura = createSvgElement("circle", {
        cx: pos.x, cy: pos.y, r: 16, class: "pulse-origin-aura"
      });
      svg.appendChild(aura);
    } else if (isAffected) {
      fill = "#c4432b";
      stroke = "#fca5a5";
    } else if (compromisedId) {
      fill = "#141824";
      stroke = "rgba(71, 85, 105, 0.3)";
    }

    const circle = createSvgElement("circle", {
      cx: pos.x, cy: pos.y,
      r: isApp ? 15 : 13,
      fill: fill,
      stroke: stroke,
      "stroke-width": isOrigin ? 3 : (isApp ? 2 : 1.5),
      class: "graph-node"
    });

    if (node.type === "package") {
      circle.addEventListener("click", () => {
        compromisedId = node.id;
        const sel = document.getElementById("node-select");
        if (sel) sel.value = node.id;
        drawGraph();
        updateInfoPanel();
      });
    }

    const label = createSvgElement("text", {
      x: pos.x, y: pos.y + 30,
      class: "node-label",
      style: (compromisedId && !isOrigin && !isAffected) ? "fill:#475569;" : ""
    });
    label.textContent = node.name;

    svg.appendChild(circle);
    svg.appendChild(label);
  });
}

function updateInfoPanel() {
  const panel = document.getElementById("info-panel");
  if (!panel) return;

  if (!compromisedId) {
    panel.innerHTML = `<div class="info-placeholder">Pick a package above to simulate a compromise.</div>`;
    return;
  }

  const node = NODES.find(n => n.id === compromisedId);
  const affected = propagate(compromisedId);
  const affectedApps = [...affected.keys()].filter(id => NODES.find(n => n.id === id).type === "app");

  const waveMap = {};
  affected.forEach((hop, id) => {
    if (!waveMap[hop]) waveMap[hop] = [];
    waveMap[hop].push(id);
  });

  let wavesHtml = "";
  Object.keys(waveMap).sort((a, b) => a - b).forEach(hop => {
    const names = waveMap[hop].map(id => {
      const n = NODES.find(item => item.id === id);
      return `<span style="${n.type === 'app' ? 'color:var(--water-cyan);font-weight:700;' : ''}">${n.name}</span>`;
    });
    wavesHtml += `
      <div class="hop-item-card">
        <div class="hop-header">
          <span class="hop-badge">Hop 0${hop}</span>
          <span style="font-size:11px; color:var(--text-dim);">${waveMap[hop].length} target(s) reached</span>
        </div>
        <div class="hop-node-tags">${names.join(", ")}</div>
      </div>
    `;
  });

  panel.innerHTML = `
    <div class="node-detail-content">
      <div class="node-detail-header">
        <span class="node-detail-name">Compromised: ${node.name}</span>
        <span class="node-type-badge" style="background:rgba(196,67,43,0.2); color:#fca5a5;">ACTIVE</span>
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
      <div style="font-size:12px; font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-top:6px;">
        Hop-by-Hop Propagation
      </div>
      <div class="hop-breakdown-list">${wavesHtml}</div>
    </div>
  `;
}

populateDropdown();
drawGraph();
updateInfoPanel();
