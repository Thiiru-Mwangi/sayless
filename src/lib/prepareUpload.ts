/**
 * Bounds for user uploads before they enter persisted app state.
 *
 * Uploads are stored as base64 data URLs in a persisted Pinia store, so an
 * untouched phone photo would put several megabytes into localStorage and into
 * the serialised export SVG. These caps are chosen from how large each image
 * is actually drawn on a 1080px canvas, with headroom to spare.
 */

/** The avatar is drawn at 144px on the Twitter canvas. */
export const AVATAR_MAX_DIMENSION = 512;

/** The poster image is drawn at up to 864px wide on the Poster canvas. */
export const POSTER_MAX_DIMENSION = 1080;

const JPEG_QUALITY = 0.85;

export interface UploadBounds {
  maxDimension: number;
  /**
   * Keep PNG output so source transparency survives. Only worth doing for
   * small images: PNG-encoded photographs stay large even when downscaled.
   */
  preservePng?: boolean;
}

/**
 * Scales a size down so its longest edge fits `maxDimension`, preserving
 * aspect ratio. Images already within bounds are left alone — never upscaled.
 */
export function fitWithin(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > 0 ? Math.min(1, maxDimension / longest) : 1;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Picks the output encoding. PNG is kept only when the source was PNG and the
 * caller asked for it, so transparency survives where it matters; photographs
 * always become JPEG, which stays far smaller.
 */
export function outputMimeType(
  sourceType: string,
  preservePng: boolean | undefined,
): "image/png" | "image/jpeg" {
  return preservePng === true && sourceType === "image/png"
    ? "image/png"
    : "image/jpeg";
}

/**
 * Decodes an uploaded file, downscales it to fit `maxDimension`, and re-encodes
 * it as a bounded data URL.
 */
export async function fileToBoundedDataUrl(
  file: File,
  bounds: UploadBounds,
): Promise<string> {
  const image = await loadImageFromFile(file);

  try {
    const { width, height } = fitWithin(
      image.naturalWidth,
      image.naturalHeight,
      bounds.maxDimension,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context unavailable.");
    }

    context.drawImage(image, 0, 0, width, height);

    const mimeType = outputMimeType(file.type, bounds.preservePng);

    return mimeType === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };

    image.src = url;
  });
}
