export async function loadWorks(url = "data/works.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`作品資料載入失敗：HTTP ${response.status}`);
  }
  return response.json();
}

function createMedia(media, title) {
  if (!media || !media.src) {
    throw new Error(`作品「${title}」缺少 media.src`);
  }

  if (media.type === "video") {
    const video = document.createElement("video");
    video.className = "project-video";
    video.playsInline = true;
    video.preload = "metadata";
    video.autoplay = media.autoplay !== false;
    video.loop = media.loop !== false;
    video.muted = media.muted !== false;
    video.setAttribute("aria-label", media.alt || title);

    if (media.poster) video.poster = media.poster;

    const source = document.createElement("source");
    source.src = media.src;
    source.type = media.mimeType || "video/mp4";
    video.append(source);
    return video;
  }

  const image = document.createElement("img");
  image.src = media.src;
  image.alt = media.alt || title;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function createSpecs(specs = []) {
  const list = document.createElement("dl");
  list.className = "project-specs";

  specs.forEach(({ label, value }) => {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    list.append(row);
  });

  return list;
}

function createSlide(work) {
  const slide = document.createElement("article");
  slide.className = "carousel-slide";
  slide.dataset.workId = work.id || "";

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "project-media";
  if (work.media?.type === "video" || work.media?.character === true) {
    mediaWrap.classList.add("character-media");
  }

  const media = createMedia(work.media, work.title);
  media.dataset.lightboxSource = "";
  media.tabIndex = 0;
  media.setAttribute("role", "button");
  media.setAttribute("aria-label", `開啟「${work.title}」全螢幕檢視`);

  const tag = document.createElement("div");
  tag.className = "image-tag";
  tag.textContent = work.tag || "";

  mediaWrap.append(media, tag);

  const info = document.createElement("div");
  info.className = "project-info";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = work.category || "";

  const title = document.createElement("h2");
  title.textContent = work.title || "未命名作品";

  const englishTitle = document.createElement("p");
  englishTitle.className = "project-en";
  englishTitle.textContent = work.englishTitle || "";

  const divider = document.createElement("div");
  divider.className = "divider";

  const description = document.createElement("p");
  description.textContent = work.description || "";

  info.append(eyebrow, title, englishTitle, divider, description, createSpecs(work.specs));
  slide.append(mediaWrap, info);
  return slide;
}

export function renderCarousel(container, section) {
  const works = section?.works || [];
  if (!works.length) {
    container.innerHTML = '<p class="empty-state">目前尚未加入作品。</p>';
    container.hidden = false;
    return;
  }

  container.setAttribute("aria-label", section.ariaLabel || section.label || "作品輪播");

  const track = document.createElement("div");
  track.className = "carousel-track";
  works.forEach(work => track.append(createSlide(work)));

  const prev = document.createElement("button");
  prev.className = "carousel-button carousel-prev";
  prev.type = "button";
  prev.setAttribute("aria-label", "上一件作品");
  prev.textContent = "‹";

  const next = document.createElement("button");
  next.className = "carousel-button carousel-next";
  next.type = "button";
  next.setAttribute("aria-label", "下一件作品");
  next.textContent = "›";

  const footer = document.createElement("div");
  footer.className = "carousel-footer";

  const counter = document.createElement("span");
  counter.className = "carousel-counter";

  const dots = document.createElement("div");
  dots.className = "carousel-dots";

  footer.append(counter, dots);
  container.replaceChildren(track, prev, next, footer);
  container.hidden = false;
}
