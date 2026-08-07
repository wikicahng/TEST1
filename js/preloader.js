const DEFAULT_TIMEOUT = 25000;
const VIDEO_READY_TIMEOUT = 18000;
const BACKGROUND_VIDEO_TIMEOUT = 45000;

const backgroundVideoPool = new Map();

function withTimeout(promise, ms, fallback) {
  return new Promise(resolve => {
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, ms);

    promise.then(value => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    }).catch(() => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(fallback);
    });
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function collectPreloadManifest(data, extraImages = []) {
  const images = [...extraImages];
  const videos = [];

  for (const section of Object.values(data || {})) {
    for (const work of section?.works || []) {
      const media = work?.media;
      if (!media?.src) continue;

      if (media.type === "video") {
        videos.push(media.src);
        if (media.poster) images.push(media.poster);
      } else {
        images.push(media.src);
      }
    }
  }

  return {
    images: unique(images),
    videos: unique(videos)
  };
}

function preloadImage(src) {
  return withTimeout(
    new Promise(resolve => {
      const image = new Image();
      image.decoding = "async";

      const done = success => {
        image.onload = null;
        image.onerror = null;
        resolve({ src, type: "image", success });
      };

      image.onload = () => done(true);
      image.onerror = () => done(false);
      image.src = src;

      if (image.complete) {
        done(image.naturalWidth > 0);
      }
    }),
    DEFAULT_TIMEOUT,
    { src, type: "image", success: false, timeout: true }
  );
}

function preloadVideoStart(src) {
  return withTimeout(
    new Promise(resolve => {
      const video = document.createElement("video");
      let finished = false;

      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("aria-hidden", "true");

      const finish = success => {
        if (finished) return;
        finished = true;
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onError);

        // Keep the start of the file warm in the browser cache for this visit.
        try { video.pause(); } catch {}
        resolve({ src, type: "video", success });
      };

      const onReady = () => finish(true);
      const onError = () => finish(false);

      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("canplay", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });

      video.src = src;
      try { video.load(); } catch { finish(false); }
    }),
    VIDEO_READY_TIMEOUT,
    { src, type: "video", success: false, timeout: true }
  );
}

async function runPool(items, worker, concurrency, onDone) {
  let cursor = 0;

  async function runner() {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      const result = await worker(item);
      onDone?.(result, index);
    }
  }

  const count = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: count }, runner));
}

export async function preloadInitialAssets(manifest, { onProgress } = {}) {
  const images = manifest?.images || [];
  const videos = manifest?.videos || [];
  const total = images.length + videos.length;

  let completed = 0;
  let failed = 0;

  const emit = (phase, currentSrc, result) => {
    completed += 1;
    if (!result?.success) failed += 1;

    onProgress?.({
      completed,
      total,
      failed,
      phase,
      src: currentSrc,
      percent: total ? Math.round((completed / total) * 100) : 100
    });
  };

  if (!total) {
    onProgress?.({
      completed: 0,
      total: 0,
      failed: 0,
      phase: "ready",
      percent: 100
    });
    return { completed: 0, total: 0, failed: 0 };
  }

  // Images are the most important assets for instant lightbox opening.
  await runPool(images, preloadImage, 5, result => {
    emit("image", result.src, result);
  });

  // For videos, preload until a decodable frame is available.
  // This does not force the browser to download every MP4 byte before entry.
  await runPool(videos, preloadVideoStart, 2, result => {
    emit("video", result.src, result);
  });

  return { completed, total, failed };
}

function createBackgroundVideo(src) {
  if (backgroundVideoPool.has(src)) {
    return backgroundVideoPool.get(src);
  }

  const video = document.createElement("video");
  video.className = "background-preload-video";
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.tabIndex = -1;
  video.setAttribute("aria-hidden", "true");
  video.src = src;

  document.body.append(video);
  backgroundVideoPool.set(src, video);
  return video;
}

async function warmBackgroundVideo(src) {
  const video = createBackgroundVideo(src);

  const ready = new Promise(resolve => {
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve({ src, success: true });
      return;
    }

    const done = success => {
      video.removeEventListener("canplaythrough", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      resolve({ src, success });
    };

    const onReady = () => done(true);
    const onError = () => done(false);

    video.addEventListener("canplaythrough", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });

    try { video.load(); } catch { done(false); }
  });

  return withTimeout(
    ready,
    BACKGROUND_VIDEO_TIMEOUT,
    { src, success: video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA, timeout: true }
  );
}

export async function startBackgroundVideoPreload(manifest, { onProgress } = {}) {
  const videos = manifest?.videos || [];
  if (!videos.length) return;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection?.saveData) {
    onProgress?.({ skipped: true, reason: "save-data" });
    return;
  }

  // Load one video at a time so large MP4s do not fight for bandwidth.
  for (let index = 0; index < videos.length; index += 1) {
    const src = videos[index];
    const result = await warmBackgroundVideo(src);
    onProgress?.({
      index: index + 1,
      total: videos.length,
      src,
      success: result.success
    });
  }
}

export function getBackgroundPreloadedVideo(src) {
  return backgroundVideoPool.get(src) || null;
}
