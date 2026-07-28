const ABOUT_COPY_SELECTOR = "#about [data-about-copy]";

function removeSecondaryAboutCopy(copy) {
  if (copy.dataset.homepageSecondaryCopyRemoved === "true") return;

  const bodyParagraphs = Array.from(copy.children).filter(
    (child) => child.tagName === "P",
  );
  if (bodyParagraphs.length < 2) return;

  bodyParagraphs.at(-1).remove();
  copy.dataset.homepageSecondaryCopyRemoved = "true";
}

function startHomepageRefinements() {
  const existing = document.querySelector(ABOUT_COPY_SELECTOR);
  if (existing) {
    removeSecondaryAboutCopy(existing);
    return;
  }

  const root = document.querySelector("#root") || document.body;
  const observer = new MutationObserver(() => {
    const copy = document.querySelector(ABOUT_COPY_SELECTOR);
    if (!copy) return;

    observer.disconnect();
    removeSecondaryAboutCopy(copy);
  });

  observer.observe(root, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startHomepageRefinements, {
    once: true,
  });
} else {
  startHomepageRefinements();
}
