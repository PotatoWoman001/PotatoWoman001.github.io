const SCROLLER_SELECTOR = "[data-solutions-scroller]";
const CARD_SELECTOR = "[data-solution-card]";
const CONTROLS_SELECTOR = "[data-solution-carousel-controls]";
const EDGE_TOLERANCE = 3;
const HINT_INTERSECTION_RATIO = 0.35;
const HINT_DISTANCE_RATIO = 0.35;
const HINT_MAX_DISTANCE = 120;
const HINT_DELAY = 180;
const HINT_FORWARD_DURATION = 520;
const HINT_HOLD_DURATION = 420;
const HINT_RETURN_DURATION = 620;

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
  if (items.length < 2 || document.querySelector(CONTROLS_SELECTOR)) return;

  scroller.dataset.solutionCarouselEnhanced = "true";
  scroller.id ||= "solution-card-scroller";
  scroller.parentElement?.classList.add("solution-card-carousel-enhanced");

  const labels = getLabels();
  const controls = document.createElement("div");
  controls.dataset.solutionCarouselControls = "";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", labels.controls);

  const previousButton = createButton("left", labels.previous, scroller.id);
  const nextButton = createButton("right", labels.next, scroller.id);
  controls.append(previousButton, nextButton);
  scroller.before(controls);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  let frame = 0;
  let currentIndex = 0;
  let userInteracted = false;
  let hintStarted = false;
  let hintAnimationFrame = 0;
  let hintAnimationResolve = null;
  let hintTimer = 0;
  let hintTimerResolve = null;
  let hintObserver = null;

  function updateState() {
    frame = 0;
    currentIndex = getCurrentIndex(scroller, items);
    const { atStart, atEnd } = getEdgeState(scroller, items);
    previousButton.disabled = atStart;
    nextButton.disabled = atEnd;
  }

  function scheduleUpdate() {
    if (frame) return;
    frame = window.requestAnimationFrame(updateState);
  }

  function finishHintAnimation(completed) {
    const resolve = hintAnimationResolve;
    hintAnimationResolve = null;
    hintAnimationFrame = 0;
    resolve?.(completed);
  }

  function cancelHintTimer() {
    if (hintTimer) {
      window.clearTimeout(hintTimer);
      hintTimer = 0;
    }
    const resolve = hintTimerResolve;
    hintTimerResolve = null;
    resolve?.(false);
  }

  function markUserInteraction() {
    userInteracted = true;
    hintObserver?.disconnect();
    hintObserver = null;
    cancelHintTimer();

    if (hintAnimationFrame) {
      window.cancelAnimationFrame(hintAnimationFrame);
      finishHintAnimation(false);
    }

    if (scroller.dataset.solutionCarouselHint !== "complete") {
      scroller.dataset.solutionCarouselHint = "cancelled";
    }
  }

  function waitForHint(duration) {
    return new Promise((resolve) => {
      hintTimerResolve = resolve;
      hintTimer = window.setTimeout(() => {
        hintTimer = 0;
        hintTimerResolve = null;
        resolve(!userInteracted);
      }, duration);
    });
  }

  function animateScrollLeft(target, duration) {
    const start = scroller.scrollLeft;
    const distance = target - start;
    const startedAt = window.performance.now();

    return new Promise((resolve) => {
      hintAnimationResolve = resolve;

      function step(now) {
        if (userInteracted) {
          finishHintAnimation(false);
          return;
        }

        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        scroller.scrollLeft = start + distance * eased;

        if (progress < 1) {
          hintAnimationFrame = window.requestAnimationFrame(step);
          return;
        }

        finishHintAnimation(true);
      }

      hintAnimationFrame = window.requestAnimationFrame(step);
    });
  }

  async function runHint() {
    if (
      userInteracted ||
      reducedMotion.matches ||
      !getEdgeState(scroller, items).atStart
    ) {
      return;
    }

    const startScrollLeft = scroller.scrollLeft;
    const itemDelta =
      items[1].getBoundingClientRect().left -
      items[0].getBoundingClientRect().left;
    const distance = Math.min(
      Math.abs(itemDelta) * HINT_DISTANCE_RATIO,
      HINT_MAX_DISTANCE,
    );

    if (!distance) {
      scroller.dataset.solutionCarouselHint = "complete";
      return;
    }

    scroller.dataset.solutionCarouselHint = "running";
    const hintedScrollLeft =
      startScrollLeft + Math.sign(itemDelta || 1) * distance;

    if (!(await animateScrollLeft(hintedScrollLeft, HINT_FORWARD_DURATION))) {
      return;
    }
    if (!(await waitForHint(HINT_HOLD_DURATION))) return;
    if (!(await animateScrollLeft(startScrollLeft, HINT_RETURN_DURATION))) {
      return;
    }

    scroller.dataset.solutionCarouselHint = "complete";
    scheduleUpdate();
  }

  function scheduleHint() {
    if (hintStarted || userInteracted) return;
    hintStarted = true;
    hintObserver?.disconnect();
    hintObserver = null;

    if (reducedMotion.matches) {
      scroller.dataset.solutionCarouselHint = "reduced";
      return;
    }

    hintTimerResolve = null;
    hintTimer = window.setTimeout(() => {
      hintTimer = 0;
      runHint();
    }, HINT_DELAY);
  }

  function navigate(offset) {
    currentIndex = getCurrentIndex(scroller, items);
    const targetIndex = Math.max(
      0,
      Math.min(items.length - 1, currentIndex + offset),
    );
    items[targetIndex].scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
    currentIndex = targetIndex;
    scheduleUpdate();
  }

  previousButton.addEventListener("click", () => {
    markUserInteraction();
    navigate(-1);
  });
  nextButton.addEventListener("click", () => {
    markUserInteraction();
    navigate(1);
  });
  scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
  reducedMotion.addEventListener?.("change", scheduleUpdate);

  ["pointerdown", "touchstart", "wheel"].forEach((eventName) => {
    scroller.addEventListener(eventName, markUserInteraction, {
      passive: true,
      once: true,
    });
  });
  scroller.addEventListener("keydown", markUserInteraction, { once: true });

  if ("IntersectionObserver" in window) {
    hintObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          !entry?.isIntersecting ||
          entry.intersectionRatio < HINT_INTERSECTION_RATIO
        ) {
          return;
        }
        scheduleHint();
      },
      { threshold: [HINT_INTERSECTION_RATIO] },
    );
    hintObserver.observe(scroller.closest("section") || scroller);
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(scroller);
    items.forEach((item) => resizeObserver.observe(item));
  } else {
    window.addEventListener("resize", scheduleUpdate, { passive: true });
  }

  updateState();
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
