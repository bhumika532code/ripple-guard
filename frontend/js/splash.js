/**
 * RIPPLE GUARD — Cinematic Spider Web Splash Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const site = document.getElementById("site");
  let completed = false;

  function finishSplash() {
    if (completed) return;
    completed = true;

    // Fade out splash gracefully
    splash.classList.add("fade-out");
    site.classList.remove("hidden");
    site.classList.add("visible");

    setTimeout(() => {
      splash.style.display = "none";
    }, 850);
  }

  // Trigger web pulse
  setTimeout(() => {
    if (!completed && typeof window.triggerWebPulse === "function") {
      window.triggerWebPulse(window.innerWidth / 2, window.innerHeight / 2, 0.95);
    }
  }, 1150);

  // Transition to main site
  setTimeout(finishSplash, 2350);

  // User click or keypress allows instant skip if desired
  splash.addEventListener("click", finishSplash);
});