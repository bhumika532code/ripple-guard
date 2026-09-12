/**
 * RIPPLE GUARD — Interactive Spider Web Simulation
 * 
 * Creates a subtle, interactive network of web nodes floating over a
 * dark background with realistic cursor interactions, expanding venom pulses,
 * and ambient node connections.
 */

(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "web-canvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "-1";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Configuration
  const SPACING = 90;
  const CONNECT_DIST = 110;
  const MOUSE_DIST = 160;
  
  let nodes = [];
  let pulses = [];

  // Mouse tracking
  let mouseX = -1000;
  let mouseY = -1000;

  function initNodes() {
    nodes = [];
    const cols = Math.ceil(width / SPACING) + 2;
    const rows = Math.ceil(height / SPACING) + 2;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        // Add some jitter for a more organic web look
        const jitterX = (Math.random() - 0.5) * SPACING * 0.8;
        const jitterY = (Math.random() - 0.5) * SPACING * 0.8;
        
        const bx = (i - 1) * SPACING + jitterX;
        const by = (j - 1) * SPACING + jitterY;

        nodes.push({
          baseX: bx,
          baseY: by,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          pulseGlow: 0 // Used for venom pulse coloration
        });
      }
    }
  }

  // Responsive resize
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initNodes();
  }
  window.addEventListener("resize", resize, { passive: true });
  initNodes();

  // Exposed method for splash impact and external triggers
  window.triggerWebPulse = function (x, y, strength = 0.9) {
    const targetX = (x !== undefined && x !== null) ? x : width / 2;
    const targetY = (y !== undefined && y !== null) ? y : height / 2;
    
    pulses.push({
      x: targetX,
      y: targetY,
      radius: 0,
      maxRadius: 800 * strength,
      speed: 12,
      thickness: 40,
      strength: strength
    });
  };

  // Cursor move handler
  window.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "mouseleave",
    () => {
      mouseX = -1000;
      mouseY = -1000;
    },
    { passive: true }
  );

  // Click creates a pulse
  window.addEventListener(
    "pointerdown",
    (e) => {
      window.triggerWebPulse(e.clientX, e.clientY, 0.6);
    },
    { passive: true }
  );

  let isTabActive = true;
  document.addEventListener("visibilitychange", () => {
    isTabActive = !document.hidden;
  });

  // Main animation loop
  function render() {
    if (!isTabActive) {
      requestAnimationFrame(render);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Process Pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.radius += p.speed;
      if (p.radius > p.maxRadius + p.thickness) {
        pulses.splice(i, 1);
      }
    }

    // 2. Process Nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Mouse repulsion
      const dx = mouseX - n.x;
      const dy = mouseY - n.y;
      const dist = Math.hypot(dx, dy);

      if (dist < MOUSE_DIST) {
        const force = (MOUSE_DIST - dist) / MOUSE_DIST;
        n.vx -= (dx / dist) * force * 0.4;
        n.vy -= (dy / dist) * force * 0.4;
      }

      // Spring back to base
      const sDx = n.baseX - n.x;
      const sDy = n.baseY - n.y;
      n.vx += sDx * 0.03;
      n.vy += sDy * 0.03;

      // Pulse interaction
      let pulseIntensity = 0;
      for (const p of pulses) {
        const pDx = p.x - n.x;
        const pDy = p.y - n.y;
        const pDist = Math.hypot(pDx, pDy);
        
        // If node is inside the shockwave band
        if (pDist < p.radius && pDist > p.radius - p.thickness) {
          const bandFactor = 1 - Math.abs((pDist - (p.radius - p.thickness / 2)) / (p.thickness / 2));
          pulseIntensity = Math.max(pulseIntensity, bandFactor * p.strength);
          
          // Slight outward push from pulse
          n.vx -= (pDx / pDist) * bandFactor * 1.5;
          n.vy -= (pDy / pDist) * bandFactor * 1.5;
        }
      }

      // Decay pulse glow
      n.pulseGlow = Math.max(0, n.pulseGlow * 0.95, pulseIntensity);

      // Apply velocity and friction
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.85;
      n.vy *= 0.85;
    }

    // 3. Draw Connections (Web Threads)
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];

      // Only check forward to avoid double-drawing
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        
        // Quick bounding box check for optimization
        if (Math.abs(n1.x - n2.x) > CONNECT_DIST || Math.abs(n1.y - n2.y) > CONNECT_DIST) {
          continue;
        }

        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const distSq = dx*dx + dy*dy;

        if (distSq < CONNECT_DIST * CONNECT_DIST) {
          const dist = Math.sqrt(distSq);
          const alpha = 1 - (dist / CONNECT_DIST);
          
          // Base color is pure white
          let r = 255, g = 255, b = 255;
          let a = alpha * 0.65; // Much higher base opacity for clear visibility

          // Add venom pulse coloring (cyan #06b6d4)
          const maxGlow = Math.max(n1.pulseGlow, n2.pulseGlow);
          if (maxGlow > 0.05) {
            // Lerp towards cyan: 6, 182, 212
            r = Math.floor(255 + (6 - 255) * maxGlow);
            g = Math.floor(255 + (182 - 255) * maxGlow);
            b = Math.floor(255 + (212 - 255) * maxGlow);
            a = Math.min(1, a + maxGlow * 0.6);
          }

          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.lineWidth = 1.0 + maxGlow * 1.0; // Bolder lines
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }

      // 4. Draw Node Points
      const alpha = 0.65 + n1.pulseGlow * 0.35;
      
      let nr = 255, ng = 255, nb = 255; // Pure white dots
      if (n1.pulseGlow > 0.05) {
        nr = Math.floor(255 + (6 - 255) * n1.pulseGlow);
        ng = Math.floor(255 + (182 - 255) * n1.pulseGlow);
        nb = Math.floor(255 + (212 - 255) * n1.pulseGlow);
      }

      ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(n1.x, n1.y, 1.2 + n1.pulseGlow * 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Cursor ambient glow
    if (mouseX > -500 && mouseY > -500) {
      const cursorGlow = ctx.createRadialGradient(mouseX, mouseY, 5, mouseX, mouseY, MOUSE_DIST * 0.8);
      cursorGlow.addColorStop(0, "rgba(255, 255, 255, 0.06)");
      cursorGlow.addColorStop(0.5, "rgba(226, 232, 240, 0.02)");
      cursorGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = cursorGlow;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, MOUSE_DIST * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
