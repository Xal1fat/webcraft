(() => {
  "use strict";

  const canvas = document.getElementById("scrub");
  const ctx = canvas.getContext("2d");
  const bar = document.getElementById("bar");
  const hint = document.getElementById("hint");
  const stage = document.getElementById("top");
  const demo = document.getElementById("demo");

  const FRAME_COUNT = 16;
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

  let raf = 0;
  let eased = 0;

  // Единый скраб: target = progress * (FRAME_COUNT - 1), сглаживание lerp 0.18.
  function run(getProgress) {
    const step = () => {
      const p = Math.min(1, Math.max(0, getProgress()));
      const target = p * (FRAME_COUNT - 1);
      eased += (target - eased) * 0.18;
      if (Math.abs(target - eased) < 0.01) eased = target;
      draw(Math.round(eased));
      if (bar) bar.style.width = `${(eased / (FRAME_COUNT - 1)) * 100}%`;
      if (eased > 0.5) hideHint();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // Десктоп: липкая сцена 220vh — прогресс от скролла сцены.
  function desktopProgress() {
    const rect = stage.getBoundingClientRect();
    const total = stage.offsetHeight - window.innerHeight;
    return total <= 0 ? 0 : -rect.top / total;
  }

  // Мобильный: без липкой сцены — прогресс от положения карточки во вьюпорте.
  // Низ экрана → кадр 0, центр → середина, уход за верхний край → последний кадр.
  function mobileProgress() {
    const r = demo.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = r.height + vh;
    return total <= 0 ? 0 : (vh - r.top) / total;
  }

  function setupMode() {
    if (reduced) return;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    run(desktopMq.matches ? desktopProgress : mobileProgress);
  }

  setupMode();
  if (desktopMq.addEventListener) {
    desktopMq.addEventListener("change", setupMode);
  }
})();
