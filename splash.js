// Plays the intro animation, then reveals the real site underneath.

window.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const site = document.getElementById("site");

  const SPLASH_DURATION_MS = 2200; // must roughly match the CSS animation timings above

  setTimeout(() => {
    splash.classList.add("fade-out");
    site.classList.remove("hidden");
    site.classList.add("visible");

    // Once faded out, remove it completely so it can't block clicks.
    setTimeout(() => {
      splash.style.display = "none";
    }, 600);
  }, SPLASH_DURATION_MS);
});