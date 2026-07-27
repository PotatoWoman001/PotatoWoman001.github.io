import { enhanceCustomerLogoWall } from "./customer-logo-wall-three-row.js";

const mount = document.querySelector("#customer-logo-wall-preview-mount");
const sourceFrame = document.querySelector("#customer-logo-wall-source");
let attempts = 0;
let stableFrames = 0;
let mounted = false;

function showError() {
  if (mounted) return;
  mount.innerHTML = `
    <p class="customer-logo-wall-preview__error">
      Customer Logo wall preview could not be loaded.
    </p>
  `;
  sourceFrame.remove();
}

function tryMountPreview() {
  if (mounted) return;
  attempts += 1;

  const sourceDocument = sourceFrame.contentDocument;
  const sourceSection = sourceDocument?.querySelector("#customer-logo-wall");
  const sourceItems = sourceSection?.querySelectorAll(
    '[data-logo-sequence="primary"] [data-customer-logo-item]',
  );
  const sourceImages = sourceSection?.querySelectorAll("img");
  const imagesReady =
    sourceImages &&
    Array.from(sourceImages).every((image) => image.complete);

  if (sourceSection && sourceItems?.length === 42 && imagesReady) {
    stableFrames += 1;
  } else {
    stableFrames = 0;
  }

  if (stableFrames >= 2) {
    const previewSection = sourceSection.cloneNode(true);
    if (!enhanceCustomerLogoWall(previewSection)) {
      showError();
      return;
    }
    mounted = true;
    mount.replaceChildren(previewSection);
    document.body.dataset.previewReady = "true";
    sourceFrame.remove();
    return;
  }

  if (attempts >= 360) {
    showError();
    return;
  }

  requestAnimationFrame(tryMountPreview);
}

sourceFrame.addEventListener("load", tryMountPreview, { once: true });
if (sourceFrame.contentDocument?.readyState === "complete") {
  requestAnimationFrame(tryMountPreview);
}
