export const durations = ["52s", "60s", "68s"];
export const directions = ["left", "right", "left"];
export const delays = ["-10s", "-28s", "-42s"];

export function enhanceCustomerLogoWall(section) {
  if (!section || section.dataset.customerLogoWallThreeRow === "true") {
    return Boolean(section);
  }

  const sourceViewport = section.querySelector(".customer-logo-wall__viewport");
  const sourcePrimary = sourceViewport?.querySelector(
    '[data-logo-sequence="primary"]',
  );
  const items = sourcePrimary ? Array.from(sourcePrimary.children) : [];
  if (!sourceViewport || !sourcePrimary || items.length !== 42) return false;

  const rows = document.createElement("div");
  rows.className = "customer-logo-wall-three-row__rows";

  durations.forEach((duration, rowIndex) => {
    const viewport = document.createElement("div");
    viewport.className =
      `${sourceViewport.className} customer-logo-wall-three-row__viewport`;
    viewport.dataset.logoWallRow = String(rowIndex + 1);
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
      `customer-logo-wall__track customer-logo-wall-three-row__track ` +
      `customer-logo-wall-three-row__track--${directions[rowIndex]} ` +
      "flex w-max";
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
  section.dataset.customerLogoWallThreeRow = "true";
  return true;
}
