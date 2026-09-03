function buildScoreboard() {
  const tbody = document.getElementById("scoreboard-body");
  const ranked = NODES
    .filter(n => n.type === "package")
    .map(n => ({ node: n, m: METRICS[n.id] }))
    .sort((a, b) => b.m.trueRisk - a.m.trueRisk);

  ranked.forEach(({ node, m }) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="dot" style="background:${riskColor(m.trueRisk)}"></span></td>
      <td>${node.name}</td>
      <td>${node.vuln}</td>
      <td style="color:${riskColor(m.trueRisk)}">${m.trueRisk}</td>
      <td>${m.directDependents}</td>
      <td>${m.affectedAppsCount} / ${TOTAL_APPS}</td>
      <td>${riskLabel(m.trueRisk)}</td>
      <td><a href="propagation.html?node=${node.id}">Simulate →</a></td>
    `;
    tbody.appendChild(row);
  });
}

buildScoreboard();