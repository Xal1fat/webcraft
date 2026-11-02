(() => {
  "use strict";

  const canvas = document.getElementById("scrub");
  const ctx = canvas.getContext("2d");
  const bar = document.getElementById("bar");
  const hint = document.getElementById("hint");
  const stage = document.getElementById("top");
  const demo = document.getElementById("demo");
  const browserLink = document.querySelector(".browser-link");

  const FRAME_COUNT = 16;
  const sources = Array.from(
    { length: FRAME_COUNT },
    (_, i) => `frames/frame-${String(i).padStart(2, "0")}.webp`
  );

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktopMq = window.matchMedia("(min-width: 981px)");

  const images = new Array(FRAME_COUNT);

  // Рисуем один кадр непрозрачно (постер/статичный кадр 0).
  function draw(i) {
    const img = images[i];
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.globalAlpha = 1;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  // Кросс-фейд между соседними кадрами: скролл выглядит непрерывным,
  // а не «прыжками» по кадрам.
  function drawBlend(eased) {
    const i = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(eased)));
    const frac = Math.max(0, Math.min(1, eased - i));
    const a = images[i];
    if (!a || !a.complete || !a.naturalWidth) return;
    ctx.globalAlpha = 1;
    ctx.drawImage(a, 0, 0, canvas.width, canvas.height);
    if (frac > 0.002 && i + 1 < FRAME_COUNT) {
      const b = images[i + 1];
      if (b && b.complete && b.naturalWidth) {
        ctx.globalAlpha = frac;
        ctx.drawImage(b, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
    }
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

  // Лёгкий 3D-наклон окна за курсором (только десктоп / мышь).
  const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canTilt && browserLink) {
    demo.addEventListener("pointermove", (e) => {
      const r = demo.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      browserLink.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
      browserLink.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
    });
    demo.addEventListener("pointerleave", () => {
      browserLink.style.setProperty("--ry", "0deg");
      browserLink.style.setProperty("--rx", "0deg");
    });
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
      drawBlend(eased);
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

  // Мобильный: прогресс от положения карточки во вьюпорте.
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
