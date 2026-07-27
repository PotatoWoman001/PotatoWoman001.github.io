import { enhanceCustomerLogoWall } from "./customer-logo-wall-three-row.js";

let attempts = 0;
let stableFrames = 0;
let enhanced = false;

function tryEnhanceHomepageLogoWall() {
  if (enhanced) return;
  attempts += 1;

  const section = document.querySelector("#customer-logo-wall");
  const primaryItems = section?.querySelectorAll(
    '[data-logo-sequence="primary"] [data-customer-logo-item]',
  );
  const images = section?.querySelectorAll(
    '[data-logo-sequence="primary"] img',
  );
  const imagesReady =
    images && Array.from(images).every((image) => image.complete);

  if (section && primaryItems?.length === 42 && imagesReady) {
    stableFrames += 1;
  } else {
    stableFrames = 0;
  }

  if (stableFrames >= 2) {
    enhanced = enhanceCustomerLogoWall(section);
    if (enhanced) return;
  }

  if (attempts < 900) {
    requestAnimationFrame(tryEnhanceHomepageLogoWall);
  }
}

requestAnimationFrame(tryEnhanceHomepageLogoWall);
