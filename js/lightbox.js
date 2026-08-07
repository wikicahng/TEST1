export function initLightbox() {
  const lightbox = document.querySelector("#mediaLightbox");
  const stage = lightbox?.querySelector("[data-lightbox-stage]");
  const mediaWrap = lightbox?.querySelector("[data-lightbox-media]");
  const scaleDisplay = lightbox?.querySelector("[data-lightbox-scale]");
  const zoomIn = lightbox?.querySelector("[data-lightbox-zoom-in]");
  const zoomOut = lightbox?.querySelector("[data-lightbox-zoom-out]");
  const reset = lightbox?.querySelector("[data-lightbox-reset]");
  const close = lightbox?.querySelector("[data-lightbox-close]");

  if (!lightbox || !stage || !mediaWrap) return;

  let scale = 1;
  let x = 0;
  let y = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let lastTrigger = null;

  const MIN = 0.5;
  const MAX = 4;
  const STEP = 0.25;

  function updateTransform() {
    mediaWrap.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    if (scaleDisplay) scaleDisplay.textContent = `${Math.round(scale * 100)}%`;
  }

  function resetTransform() {
    scale = 1;
    x = 0;
    y = 0;
    updateTransform();
  }

  function setScale(next) {
    scale = Math.max(MIN, Math.min(MAX, next));
    if (scale <= 1) {
      x = 0;
      y = 0;
    }
    updateTransform();
  }

  function setBuffering(active) {
    mediaWrap.classList.toggle("is-buffering", active);
  }

  function createExpandedMedia(source) {
    if (source.tagName === "VIDEO") {
      const video = document.createElement("video");
      video.src = source.currentSrc || source.querySelector("source")?.src || source.src;
      video.controls = true;
      video.autoplay = true;
      video.preload = "auto";
      video.loop = source.loop;
      video.muted = source.muted;
      video.playsInline = true;
      if (source.poster) video.poster = source.poster;

      video.addEventListener("loadstart", () => setBuffering(true));
      video.addEventListener("waiting", () => setBuffering(true));
      video.addEventListener("stalled", () => setBuffering(true));
      video.addEventListener("canplay", () => setBuffering(false));
      video.addEventListener("playing", () => setBuffering(false));
      video.addEventListener("error", () => setBuffering(false));

      return video;
    }

    const image = document.createElement("img");
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || "全螢幕作品圖片";
    image.decoding = "async";
    image.draggable = false;

    setBuffering(true);
    image.addEventListener("load", () => setBuffering(false), { once: true });
    image.addEventListener("error", () => setBuffering(false), { once: true });

    if (image.complete) {
      setBuffering(false);
    }

    return image;
  }

  function open(source) {
    lastTrigger = source;
    const expanded = createExpandedMedia(source);
    mediaWrap.replaceChildren(expanded);
    resetTransform();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    close?.focus();

    if (expanded.tagName === "VIDEO") {
      expanded.play().catch(() => {});
    }
  }

  function closeLightbox() {
    const video = mediaWrap.querySelector("video");
    if (video) video.pause();
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    mediaWrap.classList.remove("is-buffering");
    mediaWrap.replaceChildren();
    resetTransform();
    lastTrigger?.focus();
  }

  document.addEventListener("click", event => {
    const source = event.target.closest("[data-lightbox-source]");
    if (!source) return;
    event.stopPropagation();
    open(source);
  });

  document.addEventListener("keydown", event => {
    const source = event.target.closest?.("[data-lightbox-source]");
    if (source && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      open(source);
      return;
    }

    if (!lightbox.classList.contains("is-open")) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "+" || event.key === "=") setScale(scale + STEP);
    if (event.key === "-") setScale(scale - STEP);
    if (event.key === "0") resetTransform();
  });

  zoomIn?.addEventListener("click", () => setScale(scale + STEP));
  zoomOut?.addEventListener("click", () => setScale(scale - STEP));
  reset?.addEventListener("click", resetTransform);
  close?.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", event => {
    if (event.target === lightbox || event.target === stage) closeLightbox();
  });

  stage.addEventListener("wheel", event => {
    event.preventDefault();
    setScale(scale + (event.deltaY < 0 ? STEP : -STEP));
  }, { passive: false });

  stage.addEventListener("pointerdown", event => {
    if (scale <= 1 || event.target.closest("video")) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originX = x;
    originY = y;
    stage.classList.add("is-dragging");
    stage.setPointerCapture?.(event.pointerId);
  });

  stage.addEventListener("pointermove", event => {
    if (!dragging) return;
    x = originX + event.clientX - startX;
    y = originY + event.clientY - startY;
    updateTransform();
  });

  function stopDragging() {
    dragging = false;
    stage.classList.remove("is-dragging");
  }

  stage.addEventListener("pointerup", stopDragging);
  stage.addEventListener("pointercancel", stopDragging);

  mediaWrap.addEventListener("dblclick", () => {
    scale > 1 ? resetTransform() : setScale(2);
  });
}
