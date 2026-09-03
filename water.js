/**
 * RIPPLE GUARD — Interactive Water Surface Simulation
 * 
 * Creates a subtle, silky transparent water surface floating over a
 * dark purple/navy background with realistic cursor wakes, expanding ripples,
 * and ambient caustics. Optimized for 60fps performance without blocking any UI events.
 */

(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "water-canvas";
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

  // Responsive resize
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize, { passive: true });

  // Ripple state
  const ripples = [];
  const wakes = [];

  // Mouse tracking
  let mouseX = -1000;
  let mouseY = -1000;
  let lastMouseX = -1000;
  let lastMouseY = -1000;
  let lastMoveTime = 0;
  let mouseSpeed = 0;

  // Add ripple
  function addRipple(x, y, strength = 0.6, maxRadius = 140, speed = 2.0) {
    if (ripples.length > 35) ripples.shift(); // Bound memory
    ripples.push({
      x,
      y,
      radius: 3,
      maxRadius,
      strength,
      speed,
      opacity: strength,
      rings: [0, 0.4, 0.75],
    });
  }

  // Exposed method for splash impact and external triggers
  window.triggerWaterDrop = function (x, y, strength = 0.9) {
    const targetX = (x !== undefined && x !== null) ? x : width / 2;
    const targetY = (y !== undefined && y !== null) ? y : height / 2;
    addRipple(targetX, targetY, strength, 340, 2.6);
    setTimeout(() => {
      addRipple(targetX, targetY, strength * 0.75, 280, 2.3);
    }, 170);
    setTimeout(() => {
      addRipple(targetX, targetY, strength * 0.5, 220, 2.0);
    }, 340);
  };

  // Cursor move handler
  window.addEventListener(
    "mousemove",
    (e) => {
      const now = performance.now();
      const dt = Math.max(16, now - lastMoveTime);
      lastMoveTime = now;

      mouseX = e.clientX;
      mouseY = e.clientY;

      if (lastMouseX > -500) {
        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        const dist = Math.hypot(dx, dy);
        mouseSpeed = dist / (dt / 16);

        // Spawn subtle silky trail when moving
        if (dist > 7) {
          if (wakes.length > 50) wakes.shift();
          wakes.push({
            x: mouseX,
            y: mouseY,
            radius: Math.min(28, 8 + mouseSpeed * 1.2),
            opacity: Math.min(0.28, 0.08 + mouseSpeed * 0.02),
            vx: dx * 0.04,
            vy: dy * 0.04,
            age: 0,
            maxAge: 45,
          });

          // Occasional micro-ripple for fast movements
          if (mouseSpeed > 8 && Math.random() < 0.25) {
            addRipple(mouseX, mouseY, 0.22, 60 + mouseSpeed * 3, 1.6);
          }
        }
      }

      lastMouseX = mouseX;
      lastMouseY = mouseY;
    },
    { passive: true }
  );

  // Mouse leave
  window.addEventListener(
    "mouseleave",
    () => {
      mouseX = -1000;
      mouseY = -1000;
      lastMouseX = -1000;
      lastMouseY = -1000;
    },
    { passive: true }
  );

  // Click creates noticeable ripple
  window.addEventListener(
    "pointerdown",
    (e) => {
      addRipple(e.clientX, e.clientY, 0.85, 180, 2.5);
    },
    { passive: true }
  );

  // Ambient time counter
  let time = 0;
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

    time += 0.015;

    // 1. Dark purple/navy base gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#080713");   // deep abyss purple
    bgGradient.addColorStop(0.45, "#0b0c20"); // rich navy
    bgGradient.addColorStop(0.85, "#0e0d26"); // subtle dark violet undertone
    bgGradient.addColorStop(1, "#06070d");   // near black obsidian
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient silky caustic water waves
    ctx.save();
    const waveCount = 3;
    for (let w = 0; w < waveCount; w++) {
      ctx.beginPath();
      const waveFreq = 0.0018 + w * 0.0009;
      const waveSpeed = time * (0.8 + w * 0.4);
      const waveAmp = 22 + w * 14;
      const baseY = height * (0.28 + w * 0.24);

      ctx.moveTo(0, baseY);
      for (let x = 0; x <= width; x += 30) {
        const yOffset =
          Math.sin(x * waveFreq + waveSpeed) * waveAmp +
          Math.cos(x * waveFreq * 0.6 - waveSpeed * 0.8) * (waveAmp * 0.5);
        ctx.lineTo(x, baseY + yOffset);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      // Subtle cyan/indigo watery specular sheen
      const waveGrad = ctx.createLinearGradient(0, baseY - waveAmp, 0, baseY + waveAmp * 2);
      waveGrad.addColorStop(0, `rgba(56, 189, 248, ${0.018 - w * 0.004})`);
      waveGrad.addColorStop(0.5, `rgba(129, 140, 248, ${0.025 - w * 0.005})`);
      waveGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = waveGrad;
      ctx.fill();
    }
    ctx.restore();

    // 3. Subtle cursor meniscus displacement (soft glow around cursor)
    if (mouseX > -500 && mouseY > -500) {
      const cursorGlow = ctx.createRadialGradient(mouseX, mouseY, 4, mouseX, mouseY, 85);
      cursorGlow.addColorStop(0, "rgba(56, 189, 248, 0.07)");
      cursorGlow.addColorStop(0.5, "rgba(99, 102, 241, 0.03)");
      cursorGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = cursorGlow;
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 85, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Trailing cursor wakes (silky waves following movement)
    for (let i = wakes.length - 1; i >= 0; i--) {
      const wake = wakes[i];
      wake.age += 1;
      wake.radius += 0.45;
      wake.x += wake.vx;
      wake.y += wake.vy;
      const progress = wake.age / wake.maxAge;
      const currentOpacity = wake.opacity * (1 - progress);

      if (progress >= 1) {
        wakes.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(wake.x, wake.y, wake.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${currentOpacity * 0.6})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const wakeFill = ctx.createRadialGradient(
        wake.x, wake.y, 0,
        wake.x, wake.y, wake.radius
      );
      wakeFill.addColorStop(0, `rgba(147, 197, 253, ${currentOpacity * 0.25})`);
      wakeFill.addColorStop(0.8, `rgba(56, 189, 248, ${currentOpacity * 0.1})`);
      wakeFill.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = wakeFill;
      ctx.fill();
      ctx.restore();
    }

    // 5. Expanding water ripples (concentric rings with refraction highlight)
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += r.speed;
      const progress = r.radius / r.maxRadius;
      r.opacity = r.strength * (1 - progress);

      if (progress >= 1) {
        ripples.splice(i, 1);
        continue;
      }

      ctx.save();
      // Primary ring
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.75})`;
      ctx.lineWidth = Math.max(0.6, 2.2 * (1 - progress));
      ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Secondary interior ring
      if (r.radius > 15) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.76, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(165, 180, 252, ${r.opacity * 0.45})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Outer wave crest
      if (r.radius > 30) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 1.15, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.25})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      ctx.restore();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
