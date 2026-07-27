const durations = ["52s", "60s", "68s"];
const directions = ["left", "right", "left"];
const delays = ["-5s", "-14s", "-21s"];

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

function buildPreviewRows(section) {
  const sourceViewport = section.querySelector(".customer-logo-wall__viewport");
  const sourcePrimary = sourceViewport?.querySelector(
    '[data-logo-sequence="primary"]',
  );
  const items = sourcePrimary ? Array.from(sourcePrimary.children) : [];
  if (!sourceViewport || !sourcePrimary || items.length !== 42) return false;

  const rows = document.createElement("div");
  rows.className = "customer-logo-wall-preview__rows";

  durations.forEach((duration, rowIndex) => {
    const viewport = document.createElement("div");
    viewport.className =
      `${sourceViewport.className} customer-logo-wall-preview__viewport`;
    viewport.dataset.previewLogoRow = String(rowIndex + 1);
    viewport.setAttribute("role", "group");
    viewport.setAttribute("tabindex", "0");

    const sourceLabel =
      sourceViewport.getAttribute("aria-label") ?? "Customer logos row 1";
    viewport.setAttribute(
      "aria-label",
      sourceLabel.replace(/\d+\s*$/, String(rowIndex + 1)),
    );

    const track = document.createElement("div");
    track.className =
      `customer-logo-wall__track customer-logo-wall-preview__track ` +
      `customer-logo-wall-preview__track--${directions[rowIndex]} flex w-max`;
    track.style.setProperty("--logo-wall-duration", duration);
    track.style.setProperty("--logo-wall-delay", delays[rowIndex]);

    const sequence = sourcePrimary.cloneNode(false);
    sequence.removeAttribute("aria-hidden");
    sequence.dataset.logoSequence = "primary";
    sequence.append(
      ...items
        .slice(rowIndex * 14, (rowIndex + 1) * 14)
        .map((item) => item.cloneNode(true)),
    );

    const duplicate = sequence.cloneNode(true);
    duplicate.dataset.logoSequence = "duplicate";
    duplicate.setAttribute("aria-hidden", "true");
    duplicate.querySelectorAll("img").forEach((image) => {
      image.alt = "";
    });

    track.append(sequence, duplicate);
    viewport.append(track);
    rows.append(viewport);
  });

  sourceViewport.hidden = true;
  sourceViewport.setAttribute("aria-hidden", "true");
  sourceViewport.after(rows);
  return true;
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
    if (!buildPreviewRows(previewSection)) {
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
