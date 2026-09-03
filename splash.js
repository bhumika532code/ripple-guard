/**
 * RIPPLE GUARD — Cinematic Top-View Droplet Splash Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const site = document.getElementById("site");
  let completed = false;

  function finishSplash() {
    if (completed) return;
    completed = true;

    // Trigger canvas background water wave at center
    if (typeof window.triggerWaterDrop === "function") {
      window.triggerWaterDrop(window.innerWidth / 2, window.innerHeight / 2, 1.0);
    }

    splash.classList.add("fade-out");
    site.classList.remove("hidden");
    site.classList.add("visible");

    setTimeout(() => {
      splash.style.display = "none";
    }, 850);
  }

  // Trigger impact water ripple wave at exact contact time (approx 1.15s)
  setTimeout(() => {
    if (!completed && typeof window.triggerWaterDrop === "function") {
      window.triggerWaterDrop(window.innerWidth / 2, window.innerHeight / 2, 0.95);
    }
  }, 1150);

  // Transition to main site as transparent ripples expand across screen (2.35s)
  setTimeout(finishSplash, 2350);

  // User click or keypress allows instant skip if desired
  splash.addEventListener("click", finishSplash);
});