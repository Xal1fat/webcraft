(() => {
  "use strict";

  const canvas = document.getElementById("scrub");
  const ctx = canvas.getContext("2d");
  const bar = document.getElementById("bar");
  const hint = document.getElementById("hint");
  const stage = document.getElementById("top");
  const demo = document.getElementById("demo");

  const FRAME_COUNT = 8;
  const sources = Array.from(
    { length: FRAME_COUNT },
    (_, i) => `frames/frame-${String(i).padStart(2, "0")}.webp`
  );

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktopMq = window.matchMedia("(min-width: 981px)");

  const images = new Array(FRAME_COUNT);
  let drawn = -1;

  function draw(i) {
    if (i === drawn) return;
    const img = images[i];
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawn = i;
  }

  sources.forEach((src, i) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => { if (i === 0) draw(0); };
    images[i] = img;
  });

  function hideHint() { if (hint) hint.classList.add("is-off"); }

  if (reduced) {
    draw(0);
    if (hint) hint.remove();
    return;
  }

  let scrubRaf = 0;
  let autoplayTimer = 0;
  let observer = null;
  let played = false;

  function startScrub() {
    let eased = 0;
    const step = () => {
      const rect = stage.getBoundingClientRect();
      const total = stage.offsetHeight - window.innerHeight;
      const p = total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total));
      const target = p * (FRAME_COUNT - 1);
      eased += (target - eased) * 0.18;
      if (Math.abs(target - eased) < 0.01) eased = target;
      draw(Math.round(eased));
      if (bar) bar.style.width = `${(eased / (FRAME_COUNT - 1)) * 100}%`;
      if (eased > 0.5) hideHint();
      scrubRaf = requestAnimationFrame(step);
    };
    scrubRaf = requestAnimationFrame(step);
  }

  function playOnce() {
    if (played) return;
    played = true;
    const DURATION = 2400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      const idx = Math.min(FRAME_COUNT - 1, Math.floor(t * FRAME_COUNT));
      draw(idx);
      if (bar) bar.style.width = `${(idx / (FRAME_COUNT - 1)) * 100}%`;
      if (idx > 0) hideHint();
      if (t < 1) {
        autoplayTimer = requestAnimationFrame(step);
      } else {
        draw(FRAME_COUNT - 1);
        if (bar) bar.style.width = "100%";
      }
    };
    autoplayTimer = requestAnimationFrame(step);
  }

  function resetAutoplay() {
    played = false;
    if (autoplayTimer) cancelAnimationFrame(autoplayTimer);
    autoplayTimer = 0;
    draw(0);
    if (bar) bar.style.width = "0%";
  }

  function setupMode() {
    if (reduced) return;
    if (scrubRaf) { cancelAnimationFrame(scrubRaf); scrubRaf = 0; }
    if (observer) { observer.disconnect(); observer = null; }
    resetAutoplay();

    if (desktopMq.matches) {
      startScrub();
    } else {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            playOnce();
          } else if (!entry.isIntersecting) {
            resetAutoplay();
          }
        }
      }, { threshold: [0, 0.5] });
      observer.observe(demo);
    }
  }

  setupMode();
  if (desktopMq.addEventListener) {
    desktopMq.addEventListener("change", setupMode);
  }
})();
