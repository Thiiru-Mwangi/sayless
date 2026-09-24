import { toBlob } from "html-to-image";

type StyledElement = HTMLElement | SVGElement;

let styleProperties: string[] | null = null;

/**
 * Every computed style property except `font-size`.
 *
 * While cloning, html-to-image rewrites font sizes as `Math.floor(size) - 0.1`.
 * The range of that function contains no integers, so *every* exported size
 * lands on a fractional pixel no matter how the canvas is authored. Fractional
 * sizes defeat glyph grid-fitting and soften text.
 *
 * Dropping the property from the copied set stops the rewrite; freezeFontSizes
 * then supplies the true value through the inline style attribute, which
 * cloneNode copies verbatim.
 *
 * html-to-image caches this list internally on first use, so it must stay
 * stable for the lifetime of the page.
 */
function getStyleProperties(): string[] {
  if (styleProperties) return styleProperties;

  const computed = window.getComputedStyle(document.documentElement);
  const names: string[] = [];

  for (let index = 0; index < computed.length; index += 1) {
    const name = computed[index];
    if (name && name !== "font-size") {
      names.push(name);
    }
  }

  styleProperties = names;
  return styleProperties;
}

/**
 * Builds a filesystem-safe download name. Locale time strings contain colons
 * and, in newer ICU versions, narrow no-break spaces — neither is portable.
 */
export function buildFileName(): string {
  const stamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "numeric",
  });

  return `Sayless-${stamp.replace(/[^\dA-Za-z]+/g, "-")}.png`;
}

/**
 * Renders an element to a PNG and hands it to the browser as a download.
 *
 * Assets are prepared deterministically first: html-to-image serialises the
 * element into an SVG foreignObject and rasterises it in one pass, so anything
 * not already decoded at that moment can be missing from the output.
 */
export async function exportElementAsPng(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  await waitForAssets(element);

  const restoreFontSizes = freezeFontSizes(element);
  let blob: Blob | null;

  try {
    blob = await toBlob(element, {
      // Canvases are authored at their intrinsic export size (see
      // components/canvas/formats.ts), so one CSS pixel is one output pixel.
      pixelRatio: 1,
      cacheBust: true,
      includeStyleProperties: getStyleProperties(),
    });
  } finally {
    restoreFontSizes();
  }

  if (!blob) {
    throw new Error("The browser returned an empty image.");
  }

  triggerDownload(blob, fileName);
}

/**
 * Pins each element's computed font size as an inline style and returns a
 * function restoring the previous inline values.
 *
 * The values written are the ones already being rendered, so this is visually
 * a no-op — it only moves where the value lives, so the clone can inherit it
 * without going through html-to-image's rewrite.
 */
function freezeFontSizes(element: HTMLElement): () => void {
  const elements = collectStyledElements(element);

  // Read every value before writing any, so that pinning a parent cannot
  // perturb a child's computed size mid-pass.
  const computed = elements.map(
    (node) => window.getComputedStyle(node).fontSize,
  );
  const previous = elements.map((node) => node.style.fontSize);

  elements.forEach((node, index) => {
    node.style.fontSize = computed[index] ?? "";
  });

  return () => {
    elements.forEach((node, index) => {
      node.style.fontSize = previous[index] ?? "";
    });
  };
}

function collectStyledElements(root: HTMLElement): StyledElement[] {
  const elements: StyledElement[] = [root];

  root.querySelectorAll("*").forEach((node) => {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      elements.push(node);
    }
  });

  return elements;
}

/** Waits for fonts and every nested image to be ready for rasterisation. */
async function waitForAssets(element: HTMLElement): Promise<void> {
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Font loading is best-effort; fall back to whatever is available.
    }
  }

  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map(decodeImage));
}

async function decodeImage(image: HTMLImageElement): Promise<void> {
  try {
    if (typeof image.decode === "function") {
      await image.decode();
      return;
    }

    if (image.complete) return;

    await new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  } catch {
    // A single broken image must not block the rest of the export.
  }
}

/**
 * Downloads via an object URL rather than a base64 data URL. Data URLs for a
 * 1080x1920 PNG run to several megabytes of href, which some browsers refuse.
 */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = fileName;
  link.href = url;
  link.click();

  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
