const SCROLLER_SELECTOR = "[data-solutions-scroller]";
const CARD_SELECTOR = "[data-solution-card]";
const CONTROLS_SELECTOR = "[data-solution-carousel-controls]";
const DESKTOP_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const STICKY_TOP = 76;
const EDGE_TOLERANCE = 3;

const labelsByLocale = {
  en: {
    controls: "Solution carousel controls",
    previous: "Previous solution",
    next: "Next solution",
  },
  "zh-CN": {
    controls: "解决方案轮播控制",
    previous: "上一张解决方案",
    next: "下一张解决方案",
  },
  "fa-IR": {
    controls: "کنترل راهکارها",
    previous: "راهکار قبلی",
    next: "راهکار بعدی",
  },
};

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getLabels() {
  const language = (document.documentElement.lang || "en").toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  if (language.startsWith("zh") || pathname.startsWith("/zh")) {
    return labelsByLocale["zh-CN"];
  }
  if (language.startsWith("fa") || pathname.startsWith("/fa")) {
    return labelsByLocale["fa-IR"];
  }
  return labelsByLocale.en;
}

function createArrowIcon(direction) {
  const path =
    direction === "left"
      ? "M19 12H5m6-6-6 6 6 6"
      : "M5 12h14m-6-6 6 6-6 6";
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="${path}" fill="none" stroke="currentColor"
        stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
    </svg>
  `;
}

function createButton(direction, label, controlsId) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.solutionCarouselButton = direction;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-controls", controlsId);
  button.innerHTML = createArrowIcon(direction);
  return button;
}

function getItems(scroller) {
  return Array.from(scroller.children).filter((child) =>
    child.querySelector(CARD_SELECTOR),
  );
}

function isRtl(scroller) {
  return getComputedStyle(scroller).direction === "rtl";
}

function getCurrentIndex(scroller, items) {
  const scrollerRect = scroller.getBoundingClientRect();
  const rtl = isRtl(scroller);
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  items.forEach((item, index) => {
    const itemRect = item.getBoundingClientRect();
    const distance = rtl
      ? Math.abs(scrollerRect.right - itemRect.right)
      : Math.abs(itemRect.left - scrollerRect.left);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function getEdgeState(scroller, items) {
  const scrollerRect = scroller.getBoundingClientRect();
  const firstRect = items[0].getBoundingClientRect();
  const lastRect = items.at(-1).getBoundingClientRect();

  if (isRtl(scroller)) {
    return {
      atStart: firstRect.right <= scrollerRect.right + EDGE_TOLERANCE,
      atEnd: lastRect.left >= scrollerRect.left - EDGE_TOLERANCE,
    };
  }

  return {
    atStart: firstRect.left >= scrollerRect.left - EDGE_TOLERANCE,
    atEnd: lastRect.right <= scrollerRect.right + EDGE_TOLERANCE,
  };
}

function enhanceSolutionCarousel(scroller) {
  if (scroller.dataset.solutionCarouselEnhanced === "true") return;

  const items = getItems(scroller);
  const section = scroller.closest("section");
  const stage = scroller.parentElement;
  if (
    items.length < 2 ||
    !section ||
    !stage ||
    document.querySelector(CONTROLS_SELECTOR)
  ) {
    return;
  }

  scroller.dataset.solutionCarouselEnhanced = "true";
  scroller.id ||= "solution-card-scroller";
  stage.classList.add("solution-card-carousel-enhanced", "solution-scroll-stage");
  section.classList.add("solution-scroll-section");

  const labels = getLabels();
  const controls = document.createElement("div");
  controls.dataset.solutionCarouselControls = "";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", labels.controls);

  const previousButton = createButton("left", labels.previous, scroller.id);
  const nextButton = createButton("right", labels.next, scroller.id);
  controls.append(previousButton, nextButton);
  scroller.before(controls);

  const desktop = window.matchMedia(DESKTOP_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  let frame = 0;
  let resizeFrame = 0;
  let currentIndex = 0;
  let scrollStart = 0;
  let scrollTravel = 0;
  let scrollDriven = false;

  function setButtonState(index, edgeState) {
    if (scrollDriven) {
      previousButton.disabled = index <= 0;
      nextButton.disabled = index >= items.length - 1;
      return;
    }
    previousButton.disabled = edgeState.atStart;
    nextButton.disabled = edgeState.atEnd;
  }

  function paintScrollProgress() {
    frame = 0;
    if (!scrollDriven || scrollTravel <= 0) return;
    const progress = clamp(
      (window.scrollY - scrollStart) / scrollTravel,
      0,
      1,
    );
    const distance = progress * scrollTravel * (isRtl(scroller) ? 1 : -1);
    scroller.style.transform = `translate3d(${distance}px, 0, 0)`;
    currentIndex = Math.round(progress * (items.length - 1));
    setButtonState(currentIndex, { atStart: false, atEnd: false });
  }

  function scheduleScrollPaint() {
    if (!scrollDriven || frame) return;
    frame = window.requestAnimationFrame(paintScrollProgress);
  }

  function clearScrollDrivenLayout() {
    scrollDriven = false;
    section.classList.remove("is-scroll-driven");
    stage.classList.remove("is-scroll-driven");
    section.style.removeProperty("height");
    section.style.removeProperty("--solution-scroll-distance");
    scroller.style.removeProperty("transform");
    scroller.dataset.solutionScrollMode = "native";
    currentIndex = getCurrentIndex(scroller, items);
    setButtonState(currentIndex, getEdgeState(scroller, items));
  }

  function measure() {
    resizeFrame = 0;
    section.style.removeProperty("height");
    scroller.style.removeProperty("transform");

    if (!desktop.matches || reducedMotion.matches) {
      clearScrollDrivenLayout();
      return;
    }

    section.classList.add("is-scroll-driven");
    stage.classList.add("is-scroll-driven");
    const itemStarts = items.map((item) => item.offsetLeft);
    const itemEnds = items.map((item) => item.offsetLeft + item.offsetWidth);
    const contentWidth = Math.max(...itemEnds) - Math.min(...itemStarts);
    const viewportWidth = stage.clientWidth;
    scrollTravel = Math.max(0, contentWidth - viewportWidth);

    if (scrollTravel <= EDGE_TOLERANCE) {
      clearScrollDrivenLayout();
      return;
    }

    const sectionStyle = getComputedStyle(section);
    const paddingTop = Number.parseFloat(sectionStyle.paddingTop) || 0;
    const naturalHeight = Math.max(section.offsetHeight, stage.offsetHeight);
    section.style.setProperty("--solution-scroll-distance", `${scrollTravel}px`);
    section.style.height = `${naturalHeight + scrollTravel}px`;
    scrollStart =
      section.getBoundingClientRect().top + window.scrollY + paddingTop - STICKY_TOP;
    scrollDriven = true;
    scroller.dataset.solutionScrollMode = "driven";
    paintScrollProgress();
  }

  function scheduleMeasure() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(measure);
  }

  function updateNativeState() {
    if (scrollDriven) return;
    currentIndex = getCurrentIndex(scroller, items);
    setButtonState(currentIndex, getEdgeState(scroller, items));
  }

  function navigate(offset) {
    const targetIndex = clamp(currentIndex + offset, 0, items.length - 1);
    if (scrollDriven) {
      const targetProgress = targetIndex / (items.length - 1);
      window.scrollTo({
        top: scrollStart + targetProgress * scrollTravel,
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
    } else {
      items[targetIndex].scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "nearest",
        inline: "start",
      });
    }
    currentIndex = targetIndex;
    setButtonState(currentIndex, { atStart: false, atEnd: false });
  }

  previousButton.addEventListener("click", () => navigate(-1));
  nextButton.addEventListener("click", () => navigate(1));
  scroller.addEventListener("scroll", updateNativeState, { passive: true });
  window.addEventListener("scroll", scheduleScrollPaint, { passive: true });
  window.addEventListener("resize", scheduleMeasure, { passive: true });
  desktop.addEventListener?.("change", scheduleMeasure);
  reducedMotion.addEventListener?.("change", scheduleMeasure);

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(stage);
    items.forEach((item) => resizeObserver.observe(item));
  }

  measure();
}

function start() {
  const scroller = document.querySelector(SCROLLER_SELECTOR);
  if (scroller) {
    enhanceSolutionCarousel(scroller);
    return;
  }

  const root = document.querySelector("#root") || document.body;
  const observer = new MutationObserver(() => {
    const renderedScroller = document.querySelector(SCROLLER_SELECTOR);
    if (!renderedScroller) return;
    observer.disconnect();
    enhanceSolutionCarousel(renderedScroller);
  });
  observer.observe(root, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
