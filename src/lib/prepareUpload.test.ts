import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_DIMENSION,
  POSTER_MAX_DIMENSION,
  fitWithin,
  outputMimeType,
} from "./prepareUpload";

/**
 * Guards the upload-bounding half of the missing-image export bug: an
 * unbounded multi-megabyte data URL was what made the nested decode lose its
 * race during rasterisation. If downscaling is removed or weakened, these fail.
 */
describe("fitWithin", () => {
  it("scales a large landscape photo down to the bound", () => {
    expect(fitWithin(4000, 3000, POSTER_MAX_DIMENSION)).toEqual({
      width: 1080,
      height: 810,
    });
  });

  it("scales a large portrait photo down to the bound", () => {
    expect(fitWithin(3000, 4000, POSTER_MAX_DIMENSION)).toEqual({
      width: 810,
      height: 1080,
    });
  });

  it("bounds avatars more tightly than poster images", () => {
    expect(AVATAR_MAX_DIMENSION).toBeLessThan(POSTER_MAX_DIMENSION);

    const avatar = fitWithin(4000, 4000, AVATAR_MAX_DIMENSION);
    expect(Math.max(avatar.width, avatar.height)).toBe(AVATAR_MAX_DIMENSION);
  });

  it("never upscales an image that already fits", () => {
    expect(fitWithin(200, 120, AVATAR_MAX_DIMENSION)).toEqual({
      width: 200,
      height: 120,
    });
  });

  it("never returns a zero dimension for extreme aspect ratios", () => {
    const result = fitWithin(5000, 2, POSTER_MAX_DIMENSION);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it("tolerates a zero-sized source", () => {
    expect(fitWithin(0, 0, POSTER_MAX_DIMENSION)).toEqual({
      width: 1,
      height: 1,
    });
  });
});

describe("outputMimeType", () => {
  it("keeps PNG when the source is PNG and transparency matters", () => {
    expect(outputMimeType("image/png", true)).toBe("image/png");
  });

  it("re-encodes PNG as JPEG when transparency is not requested", () => {
    expect(outputMimeType("image/png", undefined)).toBe("image/jpeg");
  });

  it("re-encodes photographs as JPEG regardless of the request", () => {
    expect(outputMimeType("image/jpeg", true)).toBe("image/jpeg");
    expect(outputMimeType("image/heic", true)).toBe("image/jpeg");
  });
});
